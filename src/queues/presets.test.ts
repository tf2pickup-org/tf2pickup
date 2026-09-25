import { describe, expect, it } from 'vitest'
import { mapPoolSchema } from '../database/models/map-pool-entry.model'
import { createQueueSchema } from '../database/models/queue.model'
import { queuePresets } from './presets'

// https://github.com/ETF2L/gameserver-configs
const etf2lConfigs = new Set([
  'etf2l_6v6_5cp',
  'etf2l_6v6_koth',
  'etf2l_9v9_koth',
  'etf2l_9v9_stopwatch',
  'etf2l_ultiduo',
  'etf2l_bball',
])

describe.each(queuePresets)('preset $slug', preset => {
  it('is a valid queue', () => {
    expect(() => createQueueSchema.parse(preset)).not.toThrow()
  })

  it('has a valid map pool', () => {
    expect(() => mapPoolSchema.parse(preset.maps)).not.toThrow()
  })

  it('execs an ETF2L config on every map', () => {
    for (const { execConfig } of preset.maps) {
      expect(etf2lConfigs).toContain(execConfig)
    }
  })

  it('execs a config of its own gamemode', () => {
    const gamemodePrefix = {
      '6v6': 'etf2l_6v6',
      '9v9': 'etf2l_9v9',
      ultiduo: 'etf2l_ultiduo',
      bball: 'etf2l_bball',
    }[preset.gamemode]
    for (const { execConfig } of preset.maps) {
      expect(execConfig).toMatch(new RegExp(`^${gamemodePrefix}`))
    }
  })
})

it('presets have unique slugs', () => {
  const slugs = queuePresets.map(({ slug }) => slug)
  expect(new Set(slugs).size).toBe(slugs.length)
})
