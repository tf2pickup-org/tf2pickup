import { Tf2Team } from '../shared/types/tf2-team'

/**
 * On attack/defend & payload (stopwatch) maps the reported score counts captured
 * control points, so a single round bumps it by more than 1; on cp/koth/ctf it
 * only ever grows by 1 per round won. Together with the presence of control
 * point captures (absent on ctf/bball), a jump > 1 marks a stopwatch round,
 * after which TF2 switches the teams' sides.
 */
export function isStopwatchRound(params: {
  previousScore: Record<Tf2Team, number>
  score: Record<Tf2Team, number>
  captures: Record<Tf2Team, number[]> | undefined
}): boolean {
  const { previousScore, score, captures } = params
  const capturedPoints =
    (captures?.[Tf2Team.blu].length ?? 0) + (captures?.[Tf2Team.red].length ?? 0)
  const scoreJump = Math.max(
    score[Tf2Team.blu] - previousScore[Tf2Team.blu],
    score[Tf2Team.red] - previousScore[Tf2Team.red],
  )
  return capturedPoints > 0 && scoreJump > 1
}
