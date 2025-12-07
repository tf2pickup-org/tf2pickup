import type { StrictFilter } from 'mongodb'
import type { GameModel } from '../database/models/game.model'
import { collections } from '../database/collections'
import { errors } from '../errors'
import type { Paths, PickDeep } from 'type-fest'

export async function findOne<Keys extends Paths<GameModel>>(
  filter: StrictFilter<GameModel>,
  pluck?: Keys[],
): Promise<PickDeep<GameModel, Keys>> {
  const game = await collections.games.findOne<PickDeep<GameModel, Keys>>(filter, {
    ...(pluck ? { projection: Object.fromEntries(pluck.map(key => [key, 1])) } : {}),
  })
  if (game === null) {
    throw errors.notFound(`Game not found`)
  }
  return game
}
