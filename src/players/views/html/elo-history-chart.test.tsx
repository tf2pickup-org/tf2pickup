import { expect, it, vi } from 'vitest'
import { EloHistoryChart } from './elo-history-chart'
import { Gamemode } from '../../../shared/types/gamemode'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

const bySteamId = vi.hoisted(() => vi.fn())
vi.mock('../..', () => ({ players: { bySteamId } }))
vi.mock('../../../html/bundle', () => ({ bundle: async () => '/chart.js' }))

it('omits captain history and other gamemodes from the admin chart', async () => {
  bySteamId.mockResolvedValue({
    eloHistory: [
      { at: new Date(), gamemode: Gamemode.sixes, elo: { scout: 1501 }, game: 1 },
      {
        at: new Date(),
        gamemode: Gamemode.sixes,
        launchMode: 'captain',
        elo: { scout: 1999 },
        overall: 2000,
        captain: 2001,
        game: 2,
      },
      { at: new Date(), gamemode: Gamemode.highlander, elo: { scout: 1888 }, game: 3 },
    ],
  })
  const html = await EloHistoryChart({ steamId: '1' as SteamId64, gamemode: Gamemode.sixes })
  expect(html).toContain('1501')
  expect(html).not.toContain('1999')
  expect(html).not.toContain('1888')
  expect(html).not.toContain('"overall"')
  expect(html).not.toContain('"captain"')
})
