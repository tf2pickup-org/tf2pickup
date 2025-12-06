import type { Paths, PickDeep } from 'type-fest'
import { collections } from '../database/collections'
import type { PlayerModel } from '../database/models/player.model'
import { errors } from '../errors'
import type { SteamId64 } from '../shared/types/steam-id-64'

export async function bySteamId<Keys extends Paths<PlayerModel>>(
  steamId: SteamId64,
  pluck: Keys[],
): Promise<PickDeep<PlayerModel, Keys>> {
  const player = await collections.players.findOne<PickDeep<PlayerModel, Keys>>(
    { steamId },
    { projection: Object.fromEntries(pluck.map(key => [key, 1])) },
  )
  if (!player) {
    throw errors.notFound(`Player with steamId ${steamId} does not exist`)
  }

  return player
}
