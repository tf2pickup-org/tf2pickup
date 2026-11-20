import type {
  FindOneAndUpdateOptions,
  StrictFilter,
  StrictUpdateFilter,
  UpdateFilter,
} from 'mongodb'
import type { GameModel, GameNumber } from '../database/models/game.model'
import { mutex } from './mutex'
import { write } from './write'

// field updates only; state, slot status and slot connection status go through gameLifecycle
export async function update(
  numberOrFilter: GameNumber | StrictFilter<GameModel>,
  update: StrictUpdateFilter<GameModel> | UpdateFilter<GameModel>,
  options?: FindOneAndUpdateOptions,
): Promise<GameModel> {
  const filter: StrictFilter<GameModel> = Number.isInteger(numberOrFilter)
    ? { number: numberOrFilter as GameNumber }
    : (numberOrFilter as StrictFilter<GameModel>)

  const after = await mutex.runExclusive(async () => await write(filter, update, options))
  if (!after) {
    throw new Error(`game (${JSON.stringify(filter)}) not found`)
  }
  return after
}
