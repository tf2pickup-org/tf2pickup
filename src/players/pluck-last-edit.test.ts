import { describe, expect, it } from 'vitest'
import { pluckLastEdit } from './pluck-last-edit'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { Tf2ClassName } from '../shared/types/tf2-class-name'
import { Gamemode } from '../shared/types/gamemode'
import { sub } from 'date-fns'

const mockActor = '123' as SteamId64
const gamemode = Gamemode.sixes

describe('pluckLastEdit()', () => {
  it('should pluck last edit', () => {
    const lastEdit = { at: new Date(), gamemode, skill: { scout: 1 }, actor: mockActor }
    const previousEdits = [
      { at: sub(new Date(), { hours: 2 }), gamemode, skill: { scout: 1 }, actor: mockActor },
      { at: sub(new Date(), { hours: 1 }), gamemode, skill: { scout: 2 }, actor: mockActor },
    ]
    expect(pluckLastEdit([...previousEdits, lastEdit], Tf2ClassName.scout, gamemode)).toEqual({
      lastEdit,
      previousValue: 2,
    })
  })

  it('should only consider edits of the requested gamemode', () => {
    const sixesEdit = {
      at: sub(new Date(), { hours: 1 }),
      gamemode,
      skill: { scout: 2 },
      actor: mockActor,
    }
    const history = [
      { at: sub(new Date(), { hours: 2 }), gamemode, skill: { scout: 1 }, actor: mockActor },
      sixesEdit,
      { at: new Date(), gamemode: Gamemode.highlander, skill: { scout: 9 }, actor: mockActor },
    ]
    expect(pluckLastEdit(history, Tf2ClassName.scout, gamemode)).toEqual({
      lastEdit: sixesEdit,
      previousValue: 1,
    })
  })

  it('should return null when there is no history for the gamemode', () => {
    const history = [{ at: new Date(), gamemode, skill: { scout: 1 }, actor: mockActor }]
    expect(pluckLastEdit(history, Tf2ClassName.scout, Gamemode.highlander)).toBeNull()
  })

  describe('when there are no previous edits', () => {
    it('should return unknown', () => {
      const lastEdit = { at: new Date(), gamemode, skill: { scout: 1 }, actor: mockActor }
      expect(pluckLastEdit([lastEdit], Tf2ClassName.scout, gamemode)).toEqual({
        lastEdit,
        previousValue: 'unknown',
      })
    })
  })

  describe('when the last entry changed a different class', () => {
    it('should return the last edit for the queried class, not the most recent entry', () => {
      const scoutChange = {
        at: sub(new Date(), { hours: 1 }),
        gamemode,
        skill: { scout: 2, soldier: 5 },
        actor: mockActor,
      }
      const soldierChange = {
        at: new Date(),
        gamemode,
        skill: { scout: 2, soldier: 6 },
        actor: mockActor,
      }
      const history = [
        {
          at: sub(new Date(), { hours: 2 }),
          gamemode,
          skill: { scout: 1, soldier: 5 },
          actor: mockActor,
        },
        scoutChange,
        soldierChange,
      ]
      expect(pluckLastEdit(history, Tf2ClassName.scout, gamemode)).toEqual({
        lastEdit: scoutChange,
        previousValue: 1,
      })
    })

    it('should return unknown when the queried class was never changed', () => {
      const soldierChange = {
        at: new Date(),
        gamemode,
        skill: { scout: 1, soldier: 6 },
        actor: mockActor,
      }
      const history = [
        {
          at: sub(new Date(), { hours: 1 }),
          gamemode,
          skill: { scout: 1, soldier: 5 },
          actor: mockActor,
        },
        soldierChange,
      ]
      expect(pluckLastEdit(history, Tf2ClassName.scout, gamemode)).toEqual({
        lastEdit: soldierChange,
        previousValue: 'unknown',
      })
    })
  })
})
