import type { DraftModel } from '../../database/models/draft.model'
import type { GameSlotSpec } from '../../games/create-from-slots'
import type { QueueConfig } from '../../queue/types/queue-config'
import type { GameSlotId } from '../../shared/types/game-slot-id'
import { Tf2Team } from '../../shared/types/tf2-team'
import { openSlots } from './open-slots'

/**
 * Turn a finished draft into the game's roster.
 *
 * Every pick already carries its team and class. The two slots nobody was picked for are the
 * captains' own — one per team, and the matching guaranteed each captain can play theirs.
 */
export function draftToSlots(draft: DraftModel, config: QueueConfig): GameSlotSpec[] {
  const counts = new Map<string, number>()
  const nextId = (team: Tf2Team, gameClass: string): GameSlotId => {
    const key = `${team}-${gameClass}`
    const n = (counts.get(key) ?? 0) + 1
    counts.set(key, n)
    return `${key}-${n}` as GameSlotId
  }

  const captainSlots = openSlots(draft, config).map(slot => ({
    team: slot.team,
    gameClass: slot.gameClass,
    player: draft.captains[slot.team],
    isCaptain: true,
  }))

  return [...draft.picks, ...captainSlots]
    .sort((a, b) => teamOrder(a.team) - teamOrder(b.team))
    .map(entry => ({
      id: nextId(entry.team, entry.gameClass),
      player: entry.player,
      team: entry.team,
      gameClass: entry.gameClass,
      ...('isCaptain' in entry && entry.isCaptain ? { isCaptain: true } : {}),
    }))
}

function teamOrder(team: Tf2Team): number {
  return team === Tf2Team.blu ? 0 : 1
}
