import type { PlayerAvatar, PlayerModel } from '../database/models/player.model'
import { PlayerRole } from '../database/models/player.model'
import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { configuration } from '../configuration'
import { getTf2InGameHours } from '../steam/get-tf2-in-game-hours'
import { logger } from '../logger'
import { etf2l } from '../etf2l'
import { Etf2lApiError } from '../etf2l/errors/etf2l-api.error'
import { errors } from '../errors'
import { environment } from '../environment'
import { events } from '../events'
import { withLogLevel } from '../utils/with-log-level'
import { shouldMirrorBan } from '../etf2l/should-mirror-ban'
import { millisecondsToSeconds } from 'date-fns'
import type { Etf2lProfile } from '../etf2l/types/etf2l-profile'

interface UpsertPlayerParams {
  steamID: string
  nickname: string
  avatar: {
    small: string
    medium: string
    large: string
  }
}

export async function upsert(summary: UpsertPlayerParams): Promise<Pick<PlayerModel, 'steamId'>> {
  logger.trace({ summary }, 'players.upsert()')
  const steamId = steamId64.parse(summary.steamID)
  const player = await collections.players.findOne({ steamId }, { projection: { steamId: 1 } })
  if (player) {
    await collections.players.updateOne({ steamId }, { $set: { avatar: summary.avatar } })
    return player
  }

  const playerParams = await verifyPlayer({
    steamId,
    name: summary.nickname,
    avatar: summary.avatar,
  })
  return await create(playerParams)
}

async function verifyPlayer(player: CreatePlayerParams) {
  if (environment.SUPER_USER === player.steamId) {
    logger.info('registering super user')
    return {
      ...player,
      roles: [PlayerRole.admin, PlayerRole.superUser],
    }
  }

  const bypassedPlayers = await configuration.get('players.bypass_registration_restrictions')
  if (bypassedPlayers.some(steamId => steamId === player.steamId)) {
    logger.info(
      `${player.steamId} is on the list of bypassed registration restrictions. Skipping all checks`,
    )
    return player
  }

  await verifyInGameHours(player.steamId)
  player = await verifyEtf2l(player)
  return player
}

async function verifyInGameHours(steamId: SteamId64) {
  const requiredHours = await configuration.get('players.minimum_in_game_hours')
  if (requiredHours <= 0) {
    return
  }

  const reportedHours = await getTf2InGameHours(steamId)
  logger.debug({ steamId, reportedHours, requiredHours }, 'in-game hours verification')
  if (reportedHours < requiredHours) {
    logger.info({ steamId, reportedHours, requiredHours }, 'insufficient TF2 in-game hours')
    throw withLogLevel(
      errors.forbidden(
        `insufficient TF2 in-game hours (reported: ${reportedHours}, required: ${requiredHours})`,
      ),
      'info',
    )
  }
}

async function verifyEtf2l(player: CreatePlayerParams): Promise<CreatePlayerParams> {
  const etf2lAccountRequired = await configuration.get('players.etf2l_account_required')
  const etf2lBanSync = await configuration.get('players.etf2l_ban_sync')
  if (!etf2lAccountRequired && !etf2lBanSync) {
    return player
  }

  let etf2lProfile: Etf2lProfile
  try {
    etf2lProfile = await etf2l.getPlayerProfile(player.steamId)
  } catch (error) {
    if (error instanceof Etf2lApiError && error.response.status === 404 /* Not Found */) {
      if (!etf2lAccountRequired) {
        return player
      }
      logger.info({ player }, 'ETF2L.org account not found')
      throw withLogLevel(errors.forbidden(`ETF2L.org account is required`), 'info')
    }
    if (!(error instanceof Etf2lApiError) || error.response.status >= 500) {
      logger.warn({ player, error }, 'ETF2L.org API unavailable')
      throw errors.serviceUnavailable(`ETF2L.org is unavailable, please try again later`)
    }
    throw error
  }

  if (etf2lBanSync) {
    const reasons = await configuration.get('players.etf2l_ban_sync_reasons')
    if (
      etf2lProfile.bans?.some(
        ban => ban.end > millisecondsToSeconds(Date.now()) && shouldMirrorBan(ban.reason, reasons),
      )
    ) {
      logger.warn({ etf2lProfile, player }, 'banned on ETF2L.org')
      throw errors.forbidden(`you are banned on ETF2L.org`)
    }
  }

  return etf2lAccountRequired ? { ...player, name: etf2lProfile.name } : player
}

export interface CreatePlayerParams {
  steamId: SteamId64
  name: string
  avatar: PlayerAvatar
  roles?: PlayerRole[]
}

export async function create({
  steamId,
  name,
  avatar,
  roles = [],
}: CreatePlayerParams): Promise<PlayerModel> {
  const { insertedId } = await collections.players.insertOne({
    name,
    steamId,
    joinedAt: new Date(),
    avatar,
    roles,
    hasAcceptedRules: false,
    cooldownLevel: 0,
    cooldownLevelUpdatedAt: new Date(),
    preferences: {},
    stats: {
      totalGames: 0,
      gamesByClass: {},
    },
  })
  const player = (await collections.players.findOne({ _id: insertedId }))!
  logger.info({ player }, 'player created')
  events.emit('player:created', { steamId: player.steamId })
  return player
}
