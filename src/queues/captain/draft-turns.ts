import { Tf2Team } from '../../shared/types/tf2-team'

/** Each array is one timer: RED's opening single pick, then alternating doubles. */
export function draftTurns(roleCount: number): { team: Tf2Team; picks: number[] }[] {
  if (!Number.isInteger(roleCount) || roleCount < 1) {
    throw new RangeError('roleCount must be a positive integer')
  }
  const remaining = { red: roleCount - 1, blu: roleCount - 1 }
  const turns: { team: Tf2Team; picks: number[] }[] = []
  let team = Tf2Team.red
  let nextPick = 1
  while (remaining.red + remaining.blu > 0) {
    const count = Math.min(nextPick === 1 ? 1 : 2, remaining[team])
    if (count > 0) {
      turns.push({ team, picks: Array.from({ length: count }, () => nextPick++) })
      remaining[team] -= count
    }
    team = team === Tf2Team.red ? Tf2Team.blu : Tf2Team.red
  }
  return turns
}
