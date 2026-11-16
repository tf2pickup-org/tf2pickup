import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../environment', () => ({ environment: { ETF2L_API_ENDPOINT: 'https://api.etf2l.test' } }))
vi.mock('../logger', () => ({ logger: { debug: vi.fn() } }))

import { getBans } from './get-bans'

const validRow = { start: 1794775516, steamid64: '76561198148554560', reason: 'Cheating' }

describe('getBans()', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips invalid rows and keeps the rest of the page', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          bans: { data: [validRow, { ...validRow, steamid64: null }, { steamid64: 'x' }] },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetch)

    await expect(getBans(3)).resolves.toEqual([
      { start: 1794775516, steamid64: '76561198148554560' },
    ])
    expect(fetch).toHaveBeenCalledWith('https://api.etf2l.test/bans?page=3')
  })

  it('throws on an invalid envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({}))))

    await expect(getBans(1)).rejects.toThrow()
  })

  it('throws on an error status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 500, statusText: 'Server Error' })),
    )

    await expect(getBans(5)).rejects.toThrow('500 Server Error')
  })
})
