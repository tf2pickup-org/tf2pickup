import { Tf2Team } from '../shared/types/tf2-team'
import type { GameContext } from './game-context'

/**
 * Create the initial, empty {@link GameContext} for a brand-new game.
 */
export function createGameContext(): GameContext {
  return {
    score: { [Tf2Team.red]: 0, [Tf2Team.blu]: 0 },
    seenRoundStart: false,
    swapPending: false,
    isStopwatch: false,
  }
}
