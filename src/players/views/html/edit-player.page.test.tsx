import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { addDays, subDays } from 'date-fns'
import { BanDetails } from './edit-player.page'
import { players } from '../..'
import type { PlayerBan } from '../../../database/models/player.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

vi.mock('../..', () => ({ players: { bySteamId: vi.fn() } }))
vi.mock('../../../html/bundle', () => ({ bundle: vi.fn() }))
vi.mock('../../../environment', () => ({ environment: {} }))
vi.mock('../../../configuration', () => ({ configuration: { get: vi.fn() } }))
vi.mock('../../player-gamemodes', () => ({ playerGamemodes: vi.fn() }))
vi.mock('../../../html/layout', () => ({ Layout: vi.fn() }))
vi.mock('../../../html/components/navigation-bar', () => ({ NavigationBar: vi.fn() }))
vi.mock('../../../html/components/footer', () => ({ Footer: vi.fn() }))

const player = { steamId: '76561198000000001' as SteamId64, name: 'Player' }
const ban: PlayerBan = {
  actor: 'bot',
  start: subDays(new Date(), 1),
  end: addDays(new Date(), 1),
  reason: 'ETF2L.org: Cheating',
  source: 'etf2l',
}

describe('BanDetails ETF2L badge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(players.bySteamId).mockResolvedValue({ etf2lProfile: { id: 123 } })
  })

  it('links the badge to the league profile and keeps the bot issuer', async () => {
    const root = parse(await BanDetails({ player, ban }))
    expect(root.querySelector('a')?.getAttribute('href')).toBe('https://etf2l.org/forum/user/123')
    expect(root.querySelector('a')?.text).toBe('synced from ETF2L.org')
    expect(root.text).toContain('by bot')
    expect(root.querySelector('button')).not.toBeNull()
    expect(players.bySteamId).toHaveBeenCalledWith(player.steamId, ['etf2lProfile.id'])
  })

  it('renders plain badge text when no league profile exists', async () => {
    vi.mocked(players.bySteamId).mockResolvedValue({})
    const root = parse(await BanDetails({ player, ban }))
    expect(root.text).toContain('synced from ETF2L.org')
    expect(root.querySelector('a')).toBeNull()
  })

  it('keeps the badge link and marks local revocation without a revoke button', async () => {
    const root = parse(
      await BanDetails({
        player,
        ban: { ...ban, end: subDays(new Date(), 1), revokedLocally: true },
      }),
    )
    expect(root.querySelector('a')?.getAttribute('href')).toBe('https://etf2l.org/forum/user/123')
    expect(root.text).toContain('(revoked locally)')
    expect(root.querySelector('button')).toBeNull()
  })

  it('leaves normal bans unchanged and does not fetch a league profile', async () => {
    const localBan = { ...ban }
    delete localBan.source
    const root = parse(await BanDetails({ player, ban: localBan }))
    expect(root.text).not.toContain('synced from ETF2L.org')
    expect(root.text).not.toContain('(revoked locally)')
    expect(root.querySelector('button')).not.toBeNull()
    expect(players.bySteamId).not.toHaveBeenCalled()
  })
})
