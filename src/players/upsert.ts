import type { PlayerModel } from '../database/models/player.model'
import { PlayerRole } from '../database/models/player.model'
import { collections } from '../database/collections'
import { create } from './create'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { configuration } from '../configuration'
import { getTf2InGameHours } from '../steam/get-tf2-in-game-hours'
import { logger } from '../logger'
import type { CreatePlayerParams } from './types/create-player-params'
import { etf2l } from '../etf2l'
import { Etf2lApiError } from '../etf2l/errors/etf2l-api.error'
import { errors } from '../errors'
import { environment } from '../environment'

interface UpsertPlayerParams {
  steamID: string
  nickname: string
  avatar: {
    small: string
    medium: string
    large: string
  }
}

export async function upsert(summary: UpsertPlayerParams): Promise<PlayerModel> {
  logger.trace({ summary }, 'players.upsert()')
  const steamId = steamId64.parse(summary.steamID)
  const player = await collections.players.findOne({ steamId })
  if (player) {
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
      roles: [PlayerRole.superUser],
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
    throw errors.forbidden(
      `insufficient TF2 in-game hours (steamId: ${steamId}, reported: ${reportedHours}, required: ${requiredHours})`,
    )
  }
}

async function verifyEtf2l(player: CreatePlayerParams): Promise<CreatePlayerParams> {
  const etf2lAccountRequired = await configuration.get('players.etf2l_account_required')
  if (!etf2lAccountRequired) {
    return player
  }

  try {
    const etf2lProfile = await etf2l.getPlayerProfile(player.steamId)
    if (
      etf2lProfile.bans &&
      etf2lProfile.bans.filter(ban => ban.end > Date.now() / 1000).length > 0
    ) {
      throw errors.forbidden(`you are banned on ETF2L.org`)
    }

    return {
      ...player,
      name: etf2lProfile.name,
    }
  } catch (error) {
    if (error instanceof Etf2lApiError && error.response.status === 404 /* Not Found */) {
      throw errors.forbidden(`ETF2L.org account is required`)
    } else {
      throw error
    }
  }
}
