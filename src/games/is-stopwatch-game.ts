import { GameEventType, type GameEventModel } from '../database/models/game-event.model'
import { Tf2Team } from '../shared/types/tf2-team'
import { isStopwatchRound } from './is-stopwatch-round'

/**
 * A stopwatch (payload / attack-defend) game is one where at least one round
 * looks like a stopwatch round (see isStopwatchRound). This reliably tells
 * stopwatch maps apart from cp/koth/ctf.
 */
export function isStopwatchGame(events: readonly GameEventModel[]): boolean {
  let previousScore: Record<Tf2Team, number> = { [Tf2Team.blu]: 0, [Tf2Team.red]: 0 }
  for (const event of events) {
    if (event.event !== GameEventType.roundEnded) {
      continue
    }
    if (isStopwatchRound({ previousScore, score: event.score, captures: event.captures })) {
      return true
    }
    previousScore = event.score
  }
  return false
}
