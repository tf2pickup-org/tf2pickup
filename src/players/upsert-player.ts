import { UserSummary } from 'steamapi'
import type { PlayerModel } from '../database/models/player.model'
import { collections } from '../database/collections'
import { createPlayer } from './create-player'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { steamId64 } from '../shared/schemas/steam-id-64'

export async function upsertPlayer(summary: UserSummary): Promise<PlayerModel> {
  const steamId = steamId64.parse(summary.steamID)
  const player = await collections.players.findOne({ steamId })
  if (player) {
    return player
  }

  return await createPlayer({
    steamId: summary.steamID as SteamId64,
    name: summary.nickname,
    avatar: summary.avatar,
  })
}
