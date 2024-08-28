import { UserSummary } from 'steamapi'
import type { PlayerModel } from '../database/models/player.model'
import { collections } from '../database/collections'
import { createPlayer } from './create-player'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { configuration } from '../configuration'
import { getTf2InGameHours } from '../steam/get-tf2-in-game-hours'
import { InsufficientInGameHoursError } from './errors/insufficient-in-game-hours.error'
import { logger } from '../logger'

export async function upsertPlayer(summary: UserSummary): Promise<PlayerModel> {
  const steamId = steamId64.parse(summary.steamID)
  const player = await collections.players.findOne({ steamId })
  if (player) {
    return player
  }

  await verifyInGameHours(steamId)

  return await createPlayer({
    steamId: summary.steamID as SteamId64,
    name: summary.nickname,
    avatar: summary.avatar,
  })
}

async function verifyInGameHours(steamId: SteamId64) {
  const requiredHours = await configuration.get('players.minimum_in_game_hours')
  if (requiredHours <= 0) {
    return
  }

  const reportedHours = await getTf2InGameHours(steamId)
  logger.debug({ steamId, reportedHours, requiredHours }, 'in-game hours verification')
  if (reportedHours < requiredHours) {
    throw new InsufficientInGameHoursError(steamId, requiredHours, reportedHours)
  }
}
