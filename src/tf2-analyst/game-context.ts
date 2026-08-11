import type { Tf2Team } from '../shared/types/tf2-team'

/**
 * The accumulated state of a single game, threaded through {@link analyze} for
 * every log line. It is a plain, JSON-serializable object: the caller owns it,
 * persists it and rehydrates it (dates are stored as ISO strings). All state
 * needed to interpret a match — restart detection, round assembly, the pending
 * stopwatch side-swap and the running score — lives here.
 */
export interface GameContext {
  // the running committed match score
  score: Record<Tf2Team, number>

  // whether any Round_Start has been seen this match, and the last one seen —
  // together these detect the tournament-(re)start doubling (two Round_Starts
  // within ~1s)
  seenRoundStart: boolean
  lastRoundStart?: { at: string; precededByRoundStart: boolean } | undefined

  // the round currently being assembled; its outcome arrives across several log
  // lines (Round_Win, Round_Length, per-team score) that may come in any order
  round?:
    | {
        winner?: Tf2Team
        lengthMs?: number
        score?: Partial<Record<Tf2Team, number>>
        captures: Record<Tf2Team, number[]>
      }
    | undefined

  // the teams switch sides at the next Round_Start (stopwatch maps); deferred so
  // the final round produces no trailing swap
  swapPending: boolean

  // sticky: at least one round so far looked like a stopwatch round
  isStopwatch: boolean
}
