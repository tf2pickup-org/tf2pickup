import type { Tf2Team } from '../../shared/types/tf2-team'
import type { GameNumber } from './game.model'

/**
 * The in-progress assembly of a single round, persisted so that a partially
 * observed round — and the pending side-swap on stopwatch maps — survives an
 * app restart. TF2 reports a round's outcome across several log lines
 * (Round_Win, Round_Length, the per-team score) that may arrive at any time, so
 * we accumulate them here and commit a `roundEnded` game event once complete.
 * The document is cleared between rounds and removed when the match ends.
 */
export interface GameRoundProgressModel {
  gameNumber: GameNumber

  // fields of the round currently being assembled; absent once committed
  round?: {
    winner?: Tf2Team
    lengthMs?: number
    score?: Partial<Record<Tf2Team, number>>
    captures?: Partial<Record<Tf2Team, number[]>>
  }

  // the teams will switch sides when the next round starts (stopwatch maps);
  // deferred to the next round start so the final round produces no trailing swap
  swapPending?: boolean
}
