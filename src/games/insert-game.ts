import { MongoServerError } from 'mongodb'
import { collections } from '../database/collections'
import type { GameModel, GameNumber } from '../database/models/game.model'

// Numbers follow the highest one, not the newest game: merged games keep their dates.
// Two queues launching at once can pick the same number; the unique index makes one retry.
export async function insertGame(game: Omit<GameModel, 'number'>) {
  for (;;) {
    const latest = await collections.games.findOne({}, { sort: { number: -1 } })
    const number = ((latest?.number ?? 0) + 1) as GameNumber
    try {
      return await collections.games.insertOne({ ...game, number })
    } catch (error) {
      if (!(
        error instanceof MongoServerError &&
        error.code === 11000 &&
        'number' in (error['keyPattern'] ?? {})
      )) {
        throw error
      }
    }
  }
}
