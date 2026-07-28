import { describe, expect, it } from 'vitest'
import type { CaptainsPoolEntryModel } from '../../database/models/captains-pool-entry.model'
import { _6v6 } from '../../queue-auto/configs/6v6'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import { Tf2Team } from '../../shared/types/tf2-team'
import { drawCaptains } from './draw-captains'

const { scout, soldier, demoman, medic } = Tf2ClassName

function entry(
  name: string,
  gameClasses: Tf2ClassName[],
  wantsToCaptain = false,
): CaptainsPoolEntryModel {
  return {
    player: { steamId: name as unknown as SteamId64, name, avatarUrl: '' },
    gameClasses,
    wantsToCaptain,
    ready: true,
    joinedAt: new Date(),
  }
}

// a pool that can field two full 6v6 teams
function fullPool(volunteers: string[]): CaptainsPoolEntryModel[] {
  const roster: [string, Tf2ClassName[]][] = [
    ['a', [scout]],
    ['b', [scout]],
    ['c', [scout]],
    ['d', [scout]],
    ['e', [soldier]],
    ['f', [soldier]],
    ['g', [soldier]],
    ['h', [soldier]],
    ['i', [demoman]],
    ['j', [demoman]],
    ['k', [medic]],
    ['l', [medic]],
  ]
  return roster.map(([name, classes]) => entry(name, classes, volunteers.includes(name)))
}

describe('drawCaptains()', () => {
  it('refuses to draw from fewer than two volunteers', () => {
    expect(() => drawCaptains(fullPool(['a']), _6v6)).toThrow('not enough captain volunteers')
  })

  it('returns one captain per team, both volunteers', () => {
    const captains = drawCaptains(fullPool(['a', 'e', 'k']), _6v6)
    expect(['a', 'e', 'k']).toContain(captains[Tf2Team.blu] as unknown as string)
    expect(['a', 'e', 'k']).toContain(captains[Tf2Team.red] as unknown as string)
    expect(captains[Tf2Team.blu]).not.toBe(captains[Tf2Team.red])
  })

  it('spreads captaincy around rather than always picking the same pair', () => {
    const seen = new Set<string>()
    for (let attempt = 0; attempt < 60; ++attempt) {
      const captains = drawCaptains(fullPool(['a', 'e', 'i', 'k']), _6v6)
      seen.add([captains[Tf2Team.blu], captains[Tf2Team.red]].sort().join('+'))
    }
    expect(seen.size).toBeGreaterThan(1)
  })

  it('never draws a pair that could not both be fitted in', () => {
    // only two players can medic, and both volunteered — whichever way round they are drawn they
    // each have to take a medic slot, which works, so this must still succeed
    for (let attempt = 0; attempt < 30; ++attempt) {
      const captains = drawCaptains(fullPool(['k', 'l']), _6v6)
      expect([captains[Tf2Team.blu], captains[Tf2Team.red]].sort()).toEqual(['k', 'l'])
    }
  })
})
