import { describe, expect, it } from 'vitest'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { Tf2Team } from '../../shared/types/tf2-team'
import type { DraftCandidate } from '../types/draft-candidate'
import type { TeamSlot } from '../types/team-slot'
import { legalPicks } from './legal-picks'

const { scout, soldier, demoman } = Tf2ClassName
const { blu, red } = Tf2Team

function player(name: string, gameClasses: Tf2ClassName[], team?: Tf2Team): DraftCandidate {
  return { steamId: name as unknown as SteamId64, gameClasses, ...(team && { team }) }
}

function slot(team: Tf2Team, gameClass: Tf2ClassName): TeamSlot {
  return { team, gameClass }
}

function names(picks: { steamId: SteamId64; gameClass: Tf2ClassName }[]): string[] {
  return picks.map(pick => `${pick.steamId as unknown as string}/${pick.gameClass}`).sort()
}

describe('legalPicks()', () => {
  it('offers nothing when the team has no open slot', () => {
    const picks = legalPicks({
      openSlots: [slot(red, scout)],
      candidates: [player('a', [scout])],
      team: blu,
    })
    expect(picks).toEqual([])
  })

  it('offers only the classes a player signed up for', () => {
    // b on scout would strand the soldier slot, since a cannot cover it
    const picks = legalPicks({
      openSlots: [slot(blu, scout), slot(blu, soldier)],
      candidates: [player('a', [scout]), player('b', [scout, soldier])],
      team: blu,
    })
    expect(names(picks)).toEqual(['a/scout', 'b/soldier'])
  })

  it('never offers a captain — they take whatever their team has left', () => {
    const picks = legalPicks({
      openSlots: [slot(blu, soldier), slot(blu, scout), slot(red, soldier)],
      candidates: [
        player('captain', [soldier, scout], blu),
        player('a', [soldier]),
        player('b', [scout]),
        player('c', [soldier]),
      ],
      team: blu,
    })
    expect(names(picks)).toEqual(['a/soldier', 'b/scout', 'c/soldier'])
  })

  it('refuses a pick that would squeeze the captain out of the game', () => {
    // BLU's only soldier slot is the captain's only possible slot, so it is not up for grabs
    const picks = legalPicks({
      openSlots: [slot(blu, soldier), slot(red, soldier)],
      candidates: [
        player('captain', [soldier], blu),
        player('a', [soldier]),
        player('b', [soldier]),
      ],
      team: blu,
    })
    expect(picks).toEqual([])
  })

  // The board from the design mockup: pick 8 of 10, BLU on the clock.
  // BLU has kestrel on scout, axolotl on soldier and dusk on medic; RED has bramble and gale on
  // scout, flint on soldier and ivy on medic. cinder captains BLU, harbor captains RED.
  describe('mid-draft, with the pool running thin', () => {
    const openSlots = [
      slot(blu, scout),
      slot(blu, soldier),
      slot(blu, demoman),
      slot(red, soldier),
      slot(red, demoman),
    ]
    const candidates = [
      player('cinder', [soldier, demoman], blu),
      player('harbor', [scout, demoman], red),
      player('ember', [scout]),
      player('juniper', [demoman, scout]),
      player('larch', [soldier]),
      player('moss', [scout]),
    ]

    const picks = legalPicks({ openSlots, candidates, team: blu })

    it('offers exactly the picks that keep the draft completable', () => {
      expect(names(picks)).toEqual(['ember/scout', 'juniper/demoman', 'moss/scout'])
    })

    it('locks larch, the last soldier RED can still use', () => {
      expect(names(picks)).not.toContain('larch/soldier')
    })

    it('locks juniper on scout, which would strand BLU’s own demoman slot', () => {
      // juniper on demoman is fine, so this is feasibility talking, not the class count
      expect(names(picks)).toContain('juniper/demoman')
      expect(names(picks)).not.toContain('juniper/scout')
    })
  })

  it('offers a pick that empties a class only when nobody else needs it', () => {
    // 'a' is the last demoman but the only open demoman slot belongs to BLU, so taking them is fine
    const picks = legalPicks({
      openSlots: [slot(blu, demoman), slot(red, scout)],
      candidates: [player('a', [demoman]), player('b', [scout])],
      team: blu,
    })
    expect(names(picks)).toEqual(['a/demoman'])
  })

  it('offers a forced last pick', () => {
    const picks = legalPicks({
      openSlots: [slot(red, soldier)],
      candidates: [player('larch', [soldier]), player('moss', [scout])],
      team: red,
    })
    expect(names(picks)).toEqual(['larch/soldier'])
  })
})
