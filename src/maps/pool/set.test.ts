import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { set } from './set'
import { mapPoolSchema, type MapPoolEntry } from '../../database/models/map-pool-entry.model'
import { Gamemode } from '../../shared/types/gamemode'

const events = vi.hoisted(() => {
  return {
    emit: vi.fn(),
  }
})

vi.mock('../../database/collections', () => {
  let maps: MapPoolEntry[] = []
  return {
    collections: {
      maps: {
        deleteMany: vi.fn().mockImplementation(() => {
          maps.length = 0
          return Promise.resolve()
        }),
        insertMany: vi.fn().mockImplementation((newMaps: MapPoolEntry[]) => {
          maps = [...newMaps]
          return Promise.resolve()
        }),
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockImplementation(() => Promise.resolve(maps)),
        }),
      },
    },
  }
})
vi.mock('../../database/models/map-pool-entry.model', () => ({
  mapPoolSchema: {
    parse: vi.fn(),
  },
}))
vi.mock('../../events', () => ({ events }))
// Mock the gamemode so importing set.ts doesn't pull in the real environment
// (which throws when required env vars are absent, e.g. in the CI unit-test job).
vi.mock('../../shared/default-gamemode', () => ({ defaultGamemode: '6v6' }))

describe('set()', () => {
  describe('when validation fails', () => {
    beforeEach(() => {
      vi.mocked(mapPoolSchema).parse.mockImplementation(() => {
        throw new Error('validation failed')
      })
    })

    afterEach(() => {
      vi.mocked(mapPoolSchema).parse.mockRestore()
    })

    it('should reject', async () => {
      await expect(set([{ name: 'cp_process_final' }])).rejects.toThrow()
    })
  })

  it('should emit event', async () => {
    vi.mocked(mapPoolSchema).parse.mockImplementation(maps => maps)
    const maps = [{ name: 'cp_process_final' }, { name: 'cp_badlands' }, { name: 'cp_granary' }]
    await set(maps)
    // set() tags each stored map with the instance's gamemode; the reset event
    // carries those stored (tagged) entries.
    expect(events.emit).toHaveBeenCalledWith('queue/mapPool:reset', {
      maps: maps.map(map => ({ ...map, gamemode: Gamemode.sixes })),
    })
  })
})
