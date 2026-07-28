import { describe, expect, it } from 'vitest'
import { DraftState, type DraftId, type DraftModel } from '../../database/models/draft.model'
import { _6v6 } from '../../queue-auto/configs/6v6'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { Tf2Team } from '../../shared/types/tf2-team'
import { draftToSlots } from './draft-to-slots'

const { scout, soldier, demoman, medic } = Tf2ClassName
const { blu, red } = Tf2Team

const id = (name: string) => name as unknown as SteamId64

// a finished 6v6 draft: five picks a side, each captain left holding one slot
const draft: DraftModel = {
  id: 'd' as DraftId,
  state: DraftState.completed,
  createdAt: new Date(),
  captains: { [blu]: id('cinder'), [red]: id('harbor') },
  pool: [
    ['cinder', [soldier, demoman]],
    ['harbor', [scout, demoman]],
    ['dusk', [medic]],
    ['ivy', [medic]],
    ['kestrel', [scout]],
    ['bramble', [scout]],
    ['gale', [scout]],
    ['moss', [scout]],
    ['axolotl', [soldier]],
    ['flint', [soldier]],
    ['larch', [soldier]],
    ['ember', [soldier]],
    ['juniper', [demoman]],
  ].map(([name, gameClasses]) => ({
    steamId: id(name as string),
    name: name as string,
    avatarUrl: '',
    gameClasses: gameClasses as Tf2ClassName[],
  })),
  picks: [
    { team: blu, player: id('dusk'), gameClass: medic, at: new Date() },
    { team: red, player: id('ivy'), gameClass: medic, at: new Date() },
    { team: blu, player: id('kestrel'), gameClass: scout, at: new Date() },
    { team: blu, player: id('moss'), gameClass: scout, at: new Date() },
    { team: red, player: id('bramble'), gameClass: scout, at: new Date() },
    { team: blu, player: id('axolotl'), gameClass: soldier, at: new Date() },
    { team: blu, player: id('juniper'), gameClass: demoman, at: new Date() },
    { team: red, player: id('flint'), gameClass: soldier, at: new Date() },
    { team: red, player: id('larch'), gameClass: soldier, at: new Date() },
    { team: red, player: id('gale'), gameClass: scout, at: new Date() },
  ],
  mapOptions: ['a', 'b', 'c'],
  mapBans: [
    { team: red, map: 'c', at: new Date() },
    { team: blu, map: 'b', at: new Date() },
  ],
}

describe('draftToSlots()', () => {
  const slots = draftToSlots(draft, _6v6)

  it('fills every slot in the game', () => {
    expect(slots).toHaveLength(12)
    expect(slots.filter(slot => slot.team === blu)).toHaveLength(6)
    expect(slots.filter(slot => slot.team === red)).toHaveLength(6)
  })

  it('gives every player exactly one slot', () => {
    expect(new Set(slots.map(slot => slot.player)).size).toBe(12)
  })

  it('leaves the two unpicked players out', () => {
    const playing = new Set(slots.map(slot => slot.player as unknown as string))
    expect(playing.has('ember')).toBe(false)
    expect(playing.size).toBe(12)
  })

  it('marks both captains and nobody else', () => {
    const captains = slots.filter(slot => slot.isCaptain)
    expect(captains.map(slot => slot.player as unknown as string).sort()).toEqual([
      'cinder',
      'harbor',
    ])
  })

  it('gives each captain a class they signed up for', () => {
    for (const slot of slots.filter(s => s.isCaptain)) {
      const entry = draft.pool.find(p => p.steamId === slot.player)!
      expect(entry.gameClasses).toContain(slot.gameClass)
    }
  })

  it('numbers slot ids per team and class', () => {
    const ids = slots.map(slot => slot.id).sort()
    expect(new Set(ids).size).toBe(12)
    expect(ids.filter(slotId => slotId.startsWith('blu-scout-'))).toEqual([
      'blu-scout-1',
      'blu-scout-2',
    ])
  })

  it('respects the class counts the game mode needs', () => {
    for (const team of [blu, red]) {
      const counts = new Map<string, number>()
      for (const slot of slots.filter(s => s.team === team)) {
        counts.set(slot.gameClass, (counts.get(slot.gameClass) ?? 0) + 1)
      }
      expect(counts.get(scout)).toBe(2)
      expect(counts.get(soldier)).toBe(2)
      expect(counts.get(demoman)).toBe(1)
      expect(counts.get(medic)).toBe(1)
    }
  })
})
