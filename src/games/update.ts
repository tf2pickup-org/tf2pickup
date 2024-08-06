import type {
  FindOneAndUpdateOptions,
  StrictFilter,
  StrictUpdateFilter,
  UpdateFilter,
} from 'mongodb'
import type { GameModel, GameNumber } from '../database/models/game.model'
import { collections } from '../database/collections'
import { events } from '../events'
import { mutex } from './mutex'

export async function update<
  FilterType extends
    | StrictUpdateFilter<GameModel>
    | UpdateFilter<GameModel> = StrictUpdateFilter<GameModel>,
>(
  numberOrFilter: GameNumber | StrictFilter<GameModel>,
  update: FilterType,
  options?: FindOneAndUpdateOptions,
): Promise<GameModel> {
  return await mutex.runExclusive(async () => {
    let filter: StrictFilter<GameModel>
    if (Number.isInteger(numberOrFilter)) {
      filter = { number: numberOrFilter }
    } else {
      filter = numberOrFilter as StrictFilter<GameModel>
    }

    const before = await collections.games.findOne(filter)
    if (!before) {
      throw new Error(`game (${JSON.stringify(filter)}) not found`)
    }

    const after = await collections.games.findOneAndUpdate(filter, update, {
      returnDocument: 'after',
      ...options,
    })
    if (!after) {
      throw new Error(`can't update game ${JSON.stringify(filter)}`)
    }

    events.emit('game:updated', { before, after })
    return after
  })
}
