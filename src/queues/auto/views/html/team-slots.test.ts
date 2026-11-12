import { describe, expect, it } from 'vitest'
import type { QueueSlotModel } from '../../../../database/models/queue-slot.model'
import { Gamemode } from '../../../../shared/types/gamemode'
import { Tf2ClassName } from '../../../../shared/types/tf2-class-name'
import { teamSlots } from './team-slots'

const slot = (id: number, gameClass: Tf2ClassName) =>
  ({ id, gameClass }) as unknown as QueueSlotModel

describe('teamSlots()', () => {
  it('splits bball slots into two teams', () => {
    const slots = [0, 1, 2, 3].map(id => slot(id, Tf2ClassName.soldier))
    expect(teamSlots(Gamemode.bball, slots).map(team => team.map(s => s.id))).toEqual([
      [0, 2],
      [1, 3],
    ])
  })

  it('splits ultiduo slots into two teams', () => {
    const slots = [
      slot(0, Tf2ClassName.soldier),
      slot(1, Tf2ClassName.soldier),
      slot(2, Tf2ClassName.medic),
      slot(3, Tf2ClassName.medic),
    ]
    expect(teamSlots(Gamemode.ultiduo, slots).map(team => team.map(s => s.id))).toEqual([
      [0, 2],
      [1, 3],
    ])
  })

  it('returns no teams for 6v6', () => {
    expect(teamSlots(Gamemode.sixes, [])).toEqual([])
  })
})
