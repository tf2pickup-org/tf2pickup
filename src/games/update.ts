import type { StrictUpdateFilter } from 'mongodb'
import type { GameModel, GameNumber } from '../database/models/game.model'
import { collections } from '../database/collections'
import { events } from '../events'
import { mutex } from './mutex'

export async function update(
  number: GameNumber,
  update: StrictUpdateFilter<GameModel>,
): Promise<GameModel> {
  return await mutex.runExclusive(async () => {
    const before = await collections.games.findOne({ number })
    if (!before) {
      throw new Error(`game ${number} not found`)
    }

    const after = await collections.games.findOneAndUpdate({ number }, update, {
      returnDocument: 'after',
    })
    if (!after) {
      throw new Error(`can't update game ${number}`)
    }

    events.emit('game:updated', { before, after })
    return after
  })
}
