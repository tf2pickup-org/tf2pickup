import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveWhitelistId } from './resolve-whitelist-id'
import { configuration } from '../configuration'
import { Gamemode } from '../shared/types/gamemode'

vi.mock('../configuration', () => ({ configuration: { get: vi.fn() } }))

function configure(gamemodeWhitelistIds: object, whitelistId: string | null) {
  vi.mocked(configuration.get).mockImplementation(key =>
    Promise.resolve(
      (key === 'games.gamemode_whitelist_ids' ? gamemodeWhitelistIds : whitelistId) as never,
    ),
  )
}

describe('resolveWhitelistId()', () => {
  beforeEach(() => {
    configure({ [Gamemode.sixes]: 'gamemode-6v6' }, 'global')
  })

  it("prefers the queue's own whitelist", async () => {
    expect(await resolveWhitelistId({ whitelistId: 'queue', gamemode: Gamemode.sixes })).toBe(
      'queue',
    )
  })

  it("falls back to the gamemode's whitelist", async () => {
    expect(await resolveWhitelistId({ whitelistId: null, gamemode: Gamemode.sixes })).toBe(
      'gamemode-6v6',
    )
  })

  it('falls back to the global whitelist', async () => {
    expect(await resolveWhitelistId({ whitelistId: null, gamemode: Gamemode.highlander })).toBe(
      'global',
    )
  })

  it('returns null when no whitelist is set', async () => {
    configure({}, null)
    expect(await resolveWhitelistId({ whitelistId: null, gamemode: Gamemode.sixes })).toBeNull()
  })
})
