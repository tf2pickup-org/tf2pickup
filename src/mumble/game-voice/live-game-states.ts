import { GameState } from '../../database/models/game.model'

export const liveGameStates = [
  GameState.created,
  GameState.configuring,
  GameState.launching,
  GameState.started,
]
