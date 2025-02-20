import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import { errors } from '../errors'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function bySteamId(steamId: SteamId64): Promise<PlayerModel> {
  const player = await collections.players.findOne({ steamId })
  if (!player) {
    throw errors.notFound(`Player with steamId ${steamId} does not exist`)
  }

  return player
}
