import { draftTurns } from './draft-turns'

// the turn a draft with the given number of picks made is in, with the picks it still has
export function currentTurn(roleCount: number, picksMade: number) {
  const turns = draftTurns(roleCount)
  const index = turns.findIndex(turn => turn.picks.includes(picksMade + 1))
  if (index < 0) {
    return undefined
  }

  const turn = turns[index]!
  return { index, team: turn.team, remaining: turn.picks.filter(pick => pick > picksMade) }
}
