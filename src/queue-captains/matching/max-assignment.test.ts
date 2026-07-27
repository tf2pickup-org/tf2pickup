import { describe, expect, it } from 'vitest'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { DraftCandidate } from '../types/draft-candidate'
import type { TeamSlot } from '../types/team-slot'
import { maxAssignment } from './max-assignment'

const { scout, soldier, demoman, medic } = Tf2ClassName
const { blu, red } = Tf2Team

// the name doubles as the steam id so failures name the player
function player(name: string, gameClasses: Tf2ClassName[], team?: Tf2Team): DraftCandidate {
  return { steamId: name as unknown as SteamId64, gameClasses, ...(team && { team }) }
}

function slot(team: Tf2Team, gameClass: Tf2ClassName): TeamSlot {
  return { team, gameClass }
}

function filled(slots: TeamSlot[], candidates: DraftCandidate[]): number {
  return maxAssignment(slots, candidates).slots.filter(candidate => candidate !== null).length
}

describe('maxAssignment()', () => {
  it('fills every slot when the pool covers them', () => {
    const slots = [slot(blu, scout), slot(blu, medic), slot(red, scout), slot(red, medic)]
    const candidates = [
      player('a', [scout]),
      player('b', [medic]),
      player('c', [scout]),
      player('d', [medic]),
    ]
    expect(filled(slots, candidates)).toBe(4)
  })

  it('leaves a slot empty when nobody plays that class', () => {
    const slots = [slot(blu, scout), slot(blu, medic)]
    const candidates = [player('a', [scout]), player('b', [scout])]

    const assignment = maxAssignment(slots, candidates).slots
    expect(assignment[0]).not.toBeNull()
    expect(assignment[1]).toBeNull()
  })

  it('reshuffles an earlier assignment to fit a later slot', () => {
    // 'a' is the only medic, so the scout slot has to fall to 'b' even though 'a' was tried first
    const slots = [slot(blu, scout), slot(blu, medic)]
    const candidates = [player('a', [scout, medic]), player('b', [scout])]
    expect(filled(slots, candidates)).toBe(2)
  })

  it('never assigns one player to two slots', () => {
    const slots = [slot(blu, scout), slot(red, scout)]
    const candidates = [player('a', [scout])]

    const assignment = maxAssignment(slots, candidates).slots
    expect(assignment.filter(candidate => candidate !== null)).toHaveLength(1)
  })

  it('tolerates a pool larger than the game', () => {
    const slots = [slot(blu, scout)]
    const candidates = [player('a', [scout]), player('b', [scout]), player('c', [scout])]
    expect(filled(slots, candidates)).toBe(1)
  })

  it('returns nothing to fill when the pool is empty', () => {
    expect(maxAssignment([slot(blu, scout)], []).slots).toEqual([null])
  })

  describe('when a candidate is pinned to a team', () => {
    it('keeps them out of the other team', () => {
      const slots = [slot(red, soldier)]
      const candidates = [player('captain', [soldier], blu)]
      expect(filled(slots, candidates)).toBe(0)
    })

    it('still places them on their own team', () => {
      const slots = [slot(blu, soldier), slot(red, soldier)]
      const candidates = [player('captain', [soldier], blu), player('a', [soldier])]

      const assignment = maxAssignment(slots, candidates).slots
      expect(assignment[0]).toBe(0)
      expect(assignment[1]).toBe(1)
    })

    it('displaces an unpinned player who took their slot first', () => {
      // 'a' fits either side, the captain only fits BLU — 'a' has to move to RED
      const slots = [slot(blu, demoman), slot(red, demoman)]
      const candidates = [player('a', [demoman]), player('captain', [demoman], blu)]
      expect(filled(slots, candidates)).toBe(2)
    })
  })
})
