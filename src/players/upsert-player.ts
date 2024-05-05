import { PlayerSummary } from 'steamapi'
import { PlayerModel } from '../database/models/player.model'
import { collections } from '../database/collections'
import { createPlayer } from './create-player'

export async function upsertPlayer(summary: PlayerSummary): Promise<PlayerModel> {
  const player = await collections.players.findOne({ steamId: summary.steamID })
  if (player) {
    return player
  }

  return await createPlayer({
    steamId: summary.steamID,
    name: summary.nickname,
    avatar: summary.avatar,
  })
}
