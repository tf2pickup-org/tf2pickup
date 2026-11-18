import { describe, expect, it } from 'vitest'
import { mapOptions } from './map-options'

const names = (entries: [string, number][]) =>
  entries.map(([name, cooldown]) => ({ name, cooldown }))

describe('mapOptions()', () => {
  it('excludes cooling maps when eligible maps exist and draws at most three unique options', () => {
    const maps = names([
      ['A', 0],
      ['B', 0],
      ['C', 0],
      ['D', 0],
      ['E', 1],
    ])
    for (let i = 0; i < 30; i++) {
      const options = mapOptions(maps)
      expect(new Set(options).size).toBe(3)
      expect(options).not.toContain('E')
    }
    expect(maps.at(-1)?.cooldown).toBe(1)
  })
  it('keeps one or two eligible maps without filling from cooldown maps', () => {
    expect(
      mapOptions(
        names([
          ['A', 0],
          ['B', 1],
        ]),
      ),
    ).toEqual(['A'])
    expect(
      mapOptions(
        names([
          ['A', 0],
          ['B', 0],
          ['C', 1],
        ]),
      ).sort(),
    ).toEqual(['A', 'B'])
  })
  it('falls back to the ranked three lowest cooldowns rather than the minimum tier only', () => {
    expect(
      mapOptions(
        names([
          ['D', 3],
          ['B', 2],
          ['A', 1],
          ['C', 2],
        ]),
      ).sort(),
    ).toEqual(['A', 'B', 'C'])
  })
  it('randomizes ties at the cutoff, while always retaining the lower cooldown', () => {
    const outcomes = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const result = mapOptions(
        names([
          ['A', 1],
          ['B', 2],
          ['C', 2],
          ['D', 2],
        ]),
      )
      expect(result[0]).toBe('A')
      outcomes.add(result.slice(1).sort().join())
    }
    expect(outcomes.size).toBe(3)
  })
  it('returns no options for an empty map pool', () => expect(mapOptions([])).toEqual([]))
})
