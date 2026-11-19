import type { FindOneAndUpdateOptions, StrictUpdateFilter, UpdateFilter } from 'mongodb'
import type { GameModel, GameNumber, GameState } from '../../database/models/game.model'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { write } from '../write'

// callers must hold the games mutex
export async function applyTransition(
  transition: string,
  number: GameNumber,
  from: GameState[],
  update: StrictUpdateFilter<GameModel> | UpdateFilter<GameModel>,
  options?: FindOneAndUpdateOptions,
): Promise<GameModel | undefined> {
  const game = await write({ number, state: { $in: from } }, update, options)
  if (!game) {
    const current = await collections.games.findOne({ number }, { projection: { state: 1 } })
    logger.info(
      { gameNumber: number, transition, state: current?.state },
      `game #${number}: ${transition} does not apply`,
    )
  }
  return game
}
