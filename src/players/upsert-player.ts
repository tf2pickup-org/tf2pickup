import { UserSummary } from 'steamapi'
import { PlayerModel } from '../database/models/player.model'
import { collections } from '../database/collections'
import { createPlayer } from './create-player'
import { SteamId64 } from '../shared/types/steam-id-64'

export async function upsertPlayer(summary: UserSummary): Promise<PlayerModel> {
  const player = await collections.players.findOne({ steamId: summary.steamID })
  if (player) {
    return player
  }

  return await createPlayer({
    steamId: summary.steamID as SteamId64,
    name: summary.nickname,
    avatar: summary.avatar,
  })
}
