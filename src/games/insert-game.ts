import { MongoServerError } from 'mongodb'
import { collections } from '../database/collections'
import type { GameModel, GameNumber } from '../database/models/game.model'

// A launch replayed with the same token (after a crash, or a concurrent retry) gets back the game
// it already created instead of a duplicate.
// Numbers follow the highest one, not the newest game: merged games keep their dates.
// Two queues launching at once can pick the same number; the unique index makes one retry.
export async function insertGame(
  game: Omit<GameModel, 'number'> & { launchToken: string },
): Promise<{ game: GameModel; inserted: boolean }> {
  const existing = await collections.games.findOne({ launchToken: game.launchToken })
  if (existing) return { game: existing, inserted: false }

  for (;;) {
    const latest = await collections.games.findOne({}, { sort: { number: -1 } })
    const number = ((latest?.number ?? 0) + 1) as GameNumber
    try {
      const { insertedId } = await collections.games.insertOne({ ...game, number })
      const inserted = await collections.games.findOne({ _id: insertedId })
      if (!inserted) throw new Error('failed creating game')
      return { game: inserted, inserted: true }
    } catch (error) {
      const keyPattern: object | undefined =
        error instanceof MongoServerError && error.code === 11000
          ? (error['keyPattern'] as object)
          : undefined
      if (keyPattern && 'launchToken' in keyPattern) {
        const raced = await collections.games.findOne({ launchToken: game.launchToken })
        if (raced) return { game: raced, inserted: false }
      }
      if (!keyPattern || !('number' in keyPattern)) throw error
    }
  }
}
