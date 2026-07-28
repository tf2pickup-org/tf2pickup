import { describe, expect, it } from 'vitest'
import { DraftState, type DraftId, type DraftModel } from '../../database/models/draft.model'
import { _6v6 } from '../../queue-auto/configs/6v6'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { Tf2Team } from '../../shared/types/tf2-team'
import { currentTurn } from './current-turn'
import { openSlots } from './open-slots'

const { scout, soldier, demoman, medic } = Tf2ClassName
const { blu, red } = Tf2Team

function draftWith(picks: { team: Tf2Team; gameClass: Tf2ClassName }[]): DraftModel {
  return {
    id: 'draft' as DraftId,
    state: DraftState.picking,
    createdAt: new Date(),
    captains: { [blu]: 'a' as SteamId64, [red]: 'b' as SteamId64 },
    pool: [],
    picks: picks.map((pick, index) => ({
      ...pick,
      player: `p${index}` as SteamId64,
      at: new Date(),
    })),
  }
}

describe('currentTurn()', () => {
  it('starts with BLU', () => {
    expect(currentTurn(draftWith([]), _6v6)).toEqual({ index: 0, team: blu, total: 10 })
  })

  it('follows the pick order', () => {
    const teams = [blu, red, red, blu, blu, red, red, blu, blu, red]
    for (let taken = 0; taken < teams.length; ++taken) {
      const picks = teams.slice(0, taken).map(team => ({ team, gameClass: scout }))
      expect(currentTurn(draftWith(picks), _6v6)?.team).toBe(teams[taken])
    }
  })

  it('is over once every turn has been taken', () => {
    const picks = Array.from({ length: 10 }, () => ({ team: blu, gameClass: scout }))
    expect(currentTurn(draftWith(picks), _6v6)).toBeNull()
  })
})

describe('openSlots()', () => {
  it('starts with every slot in the game', () => {
    expect(openSlots(draftWith([]), _6v6)).toHaveLength(12)
  })

  it('removes a slot per pick, on the right team', () => {
    const slots = openSlots(draftWith([{ team: blu, gameClass: medic }]), _6v6)
    expect(slots).toHaveLength(11)
    expect(slots.filter(slot => slot.team === blu && slot.gameClass === medic)).toHaveLength(0)
    expect(slots.filter(slot => slot.team === red && slot.gameClass === medic)).toHaveLength(1)
  })

  it('leaves one slot per team once every pick is in', () => {
    const picks = [
      ...[scout, scout, soldier, soldier, demoman].map(gameClass => ({ team: blu, gameClass })),
      ...[scout, scout, soldier, soldier, demoman].map(gameClass => ({ team: red, gameClass })),
    ]
    const slots = openSlots(draftWith(picks), _6v6)
    expect(slots).toHaveLength(2)
    expect(slots.map(slot => slot.gameClass)).toEqual([medic, medic])
  })
})
