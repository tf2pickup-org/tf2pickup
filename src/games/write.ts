import type {
  FindOneAndUpdateOptions,
  StrictFilter,
  StrictUpdateFilter,
  UpdateFilter,
} from 'mongodb'
import type { GameModel } from '../database/models/game.model'
import { collections } from '../database/collections'
import { events } from '../events'

// callers must hold the games mutex
export async function write(
  filter: StrictFilter<GameModel>,
  update: StrictUpdateFilter<GameModel> | UpdateFilter<GameModel>,
  options?: FindOneAndUpdateOptions,
): Promise<GameModel | undefined> {
  const before = await collections.games.findOne(filter)
  if (!before) {
    return undefined
  }

  const after = await collections.games.findOneAndUpdate(filter, update, {
    returnDocument: 'after',
    ...options,
  })
  if (!after) {
    return undefined
  }

  events.emit('game:updated', { before, after })
  return after
}
