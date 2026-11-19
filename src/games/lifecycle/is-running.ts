import type { GameModel } from '../../database/models/game.model'
import { runningGameStates } from './running-game-states'

export function isRunning(game: Pick<GameModel, 'state'>) {
  return runningGameStates.includes(game.state)
}
