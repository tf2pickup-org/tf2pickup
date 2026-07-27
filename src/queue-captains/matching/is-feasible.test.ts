import { describe, expect, it } from 'vitest'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { DraftCandidate } from '../types/draft-candidate'
import type { TeamSlot } from '../types/team-slot'
import { isFeasible } from './is-feasible'

const { scout, soldier, demoman } = Tf2ClassName
const { blu, red } = Tf2Team

function player(name: string, gameClasses: Tf2ClassName[], team?: Tf2Team): DraftCandidate {
  return { steamId: name as unknown as SteamId64, gameClasses, ...(team && { team }) }
}

function slot(team: Tf2Team, gameClass: Tf2ClassName): TeamSlot {
  return { team, gameClass }
}

describe('isFeasible()', () => {
  it('accepts a pool that covers every slot', () => {
    expect(
      isFeasible(
        [slot(blu, scout), slot(red, soldier)],
        [player('a', [scout]), player('b', [soldier])],
      ),
    ).toBe(true)
  })

  it('accepts spare players sitting the game out', () => {
    expect(isFeasible([slot(blu, scout)], [player('a', [scout]), player('b', [scout])])).toBe(true)
  })

  it('rejects a slot nobody can fill', () => {
    expect(isFeasible([slot(blu, scout), slot(blu, demoman)], [player('a', [scout])])).toBe(false)
  })

  it('accepts nothing left to do', () => {
    expect(isFeasible([], [])).toBe(true)
  })

  describe('captains', () => {
    it('rejects a completion that leaves a captain without a slot', () => {
      // BLU is already full, so the remaining slot can only go to 'a' — and that squeezes the BLU
      // captain out of their own game, which is not a valid way to finish a draft
      expect(
        isFeasible(
          [slot(red, soldier)],
          [player('captain', [soldier], blu), player('a', [soldier])],
        ),
      ).toBe(false)
    })

    it('accepts when the captain can still be fitted in', () => {
      expect(
        isFeasible(
          [slot(blu, soldier), slot(red, soldier)],
          [player('captain', [soldier], blu), player('a', [soldier])],
        ),
      ).toBe(true)
    })

    it('rejects a captain who cannot play any class their team still needs', () => {
      expect(
        isFeasible(
          [slot(blu, scout), slot(red, soldier)],
          [player('captain', [soldier], blu), player('a', [scout])],
        ),
      ).toBe(false)
    })

    it('fits both captains at once', () => {
      expect(
        isFeasible(
          [slot(blu, demoman), slot(red, demoman)],
          [player('one', [demoman], blu), player('two', [demoman], red)],
        ),
      ).toBe(true)
    })
  })
})
