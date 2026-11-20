import { GameState } from '../../database/models/game.model'

export const runningGameStates: GameState[] = [
  GameState.created,
  GameState.configuring,
  GameState.launching,
  GameState.started,
]
