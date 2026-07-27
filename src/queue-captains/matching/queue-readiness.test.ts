import { describe, expect, it } from 'vitest'
import { _6v6 } from '../../queue-auto/configs/6v6'
import { _9v9 } from '../../queue-auto/configs/9v9'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { DraftCandidate } from '../types/draft-candidate'
import { queueReadiness } from './queue-readiness'

const { scout, soldier, demoman, medic } = Tf2ClassName

function player(name: string, ...gameClasses: Tf2ClassName[]): DraftCandidate {
  return { steamId: name as unknown as SteamId64, gameClasses }
}

describe('queueReadiness()', () => {
  it('needs twelve slots for 6v6 and eighteen for 9v9', () => {
    expect(queueReadiness([], _6v6).required).toBe(12)
    expect(queueReadiness([], _9v9).required).toBe(18)
  })

  it('reports an empty pool as filling nothing', () => {
    const readiness = queueReadiness([], _6v6)
    expect(readiness.fillable).toBe(0)
    expect(readiness.missing).toHaveLength(12)
  })

  describe('with a pool that is one soldier and one medic short', () => {
    // thirteen players, but only three can play soldier and only one can play medic
    const pool = [
      player('axolotl', soldier, scout),
      player('bramble', scout),
      player('cinder', soldier, demoman),
      player('dusk', medic, scout),
      player('ember', scout),
      player('flint', soldier),
      player('gale', scout, demoman),
      player('harbor', scout, demoman),
      player('ivy', scout),
      player('juniper', demoman, scout),
      player('kestrel', scout),
      player('larch', scout),
      player('moss', scout),
    ]

    it('fills ten of the twelve slots', () => {
      expect(queueReadiness(pool, _6v6).fillable).toBe(10)
    })

    it('names the two classes it is waiting for', () => {
      expect([...queueReadiness(pool, _6v6).missing].sort()).toEqual([medic, soldier])
    })

    it('does not count a headcount of thirteen as ready', () => {
      const readiness = queueReadiness(pool, _6v6)
      expect(pool.length).toBeGreaterThan(readiness.required)
      expect(readiness.fillable).toBeLessThan(readiness.required)
    })
  })

  it('is ready once the missing classes turn up', () => {
    const pool = [
      player('axolotl', soldier),
      player('bramble', scout),
      player('cinder', soldier),
      player('dusk', medic),
      player('ember', scout),
      player('flint', soldier),
      player('gale', demoman),
      player('harbor', demoman),
      player('ivy', scout),
      player('juniper', soldier),
      player('kestrel', scout),
      player('larch', medic),
    ]

    const readiness = queueReadiness(pool, _6v6)
    expect(readiness.fillable).toBe(readiness.required)
    expect(readiness.missing).toEqual([])
  })

  it('counts a multi-class player towards one slot only', () => {
    // one player who can cover everything still leaves eleven slots open
    const readiness = queueReadiness([player('solo', scout, soldier, demoman, medic)], _6v6)
    expect(readiness.fillable).toBe(1)
  })
})
