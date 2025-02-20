import type { Filter } from 'mongodb'
import type { GameModel } from '../database/models/game.model'
import { collections } from '../database/collections'
import { errors } from '../errors'

export async function findOne(filter: Filter<GameModel>): Promise<GameModel> {
  const game = await collections.games.findOne(filter)
  if (game === null) {
    throw errors.notFound(`Game not found`)
  }
  return game
}
