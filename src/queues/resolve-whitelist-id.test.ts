import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveWhitelistId } from './resolve-whitelist-id'
import { configuration } from '../configuration'

vi.mock('../configuration', () => ({ configuration: { get: vi.fn() } }))

describe('resolveWhitelistId()', () => {
  beforeEach(() => {
    vi.mocked(configuration.get).mockResolvedValue('global' as never)
  })

  it("prefers the queue's own whitelist", async () => {
    expect(await resolveWhitelistId({ whitelistId: 'queue' })).toBe('queue')
  })

  it('falls back to the global whitelist', async () => {
    expect(await resolveWhitelistId({ whitelistId: null })).toBe('global')
  })

  it('returns null when no whitelist is set', async () => {
    vi.mocked(configuration.get).mockResolvedValue(null as never)
    expect(await resolveWhitelistId({ whitelistId: null })).toBeNull()
  })
})
