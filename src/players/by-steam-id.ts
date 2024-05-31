import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { PlayerNotFoundError } from './errors'

export async function bySteamId(steamId: SteamId64): Promise<PlayerModel> {
  const player = await collections.players.findOne({ steamId })
  if (!player) {
    throw new PlayerNotFoundError(steamId)
  }

  return player
}
