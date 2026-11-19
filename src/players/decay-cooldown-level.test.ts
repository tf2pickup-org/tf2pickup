import { describe, expect, it } from 'vitest'
import { milliseconds } from 'date-fns'
import { decayCooldownLevel } from './decay-cooldown-level'

const lastChanged = new Date('2026-01-01T00:00:00.000Z')
const month = milliseconds({ months: 1 })

describe('decayCooldownLevel()', () => {
  it('drops one level per full decay period', () => {
    expect(
      decayCooldownLevel(
        { cooldownLevel: 4, cooldownLevelUpdatedAt: lastChanged },
        new Date(lastChanged.getTime() + 2 * month),
        month,
      ),
    ).toEqual({
      level: 2,
      decayedLevels: 2,
      nextDecayAt: new Date(lastChanged.getTime() + 3 * month),
    })
  })

  it('only decays for complete periods', () => {
    const { level, decayedLevels } = decayCooldownLevel(
      { cooldownLevel: 4, cooldownLevelUpdatedAt: lastChanged },
      new Date(lastChanged.getTime() + month - milliseconds({ days: 1 })),
      month,
    )
    expect({ level, decayedLevels }).toEqual({ level: 4, decayedLevels: 0 })
  })

  it('never goes below zero', () => {
    const { level, nextDecayAt } = decayCooldownLevel(
      { cooldownLevel: 2, cooldownLevelUpdatedAt: lastChanged },
      new Date(lastChanged.getTime() + 10 * month),
      month,
    )
    expect({ level, nextDecayAt }).toEqual({ level: 0, nextDecayAt: null })
  })

  it('does not decay backwards for a level changed in the future', () => {
    const { level } = decayCooldownLevel(
      { cooldownLevel: 3, cooldownLevelUpdatedAt: new Date(lastChanged.getTime() + month) },
      lastChanged,
      month,
    )
    expect(level).toBe(3)
  })

  it('decays nothing when the decay is disabled', () => {
    expect(
      decayCooldownLevel(
        { cooldownLevel: 5, cooldownLevelUpdatedAt: lastChanged },
        new Date(lastChanged.getTime() + 10 * month),
        0,
      ),
    ).toEqual({ level: 5, decayedLevels: 0, nextDecayAt: null })
  })

  it('decays nothing when the level has no recorded change date', () => {
    expect(decayCooldownLevel({ cooldownLevel: 5 }, new Date(), month)).toEqual({
      level: 5,
      decayedLevels: 0,
      nextDecayAt: null,
    })
  })
})
