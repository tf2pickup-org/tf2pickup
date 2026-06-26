import { GameState } from '../database/models/game.model'

export function gameStateLabel(state: GameState) {
  switch (state) {
    case GameState.created:
    case GameState.configuring:
    case GameState.launching:
      return 'starting soon'
    case GameState.started:
      return 'in progress'
    case GameState.ended:
      return 'ended'
    case GameState.interrupted:
      return 'interrupted'
  }
}
