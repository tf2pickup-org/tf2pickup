import { describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { addDays, subDays } from 'date-fns'
import { RestrictionDetails } from './edit-player.page'
import type { PlayerBan } from '../../../database/models/player.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { isActive } from '../../restrictions/is-active'

vi.mock('../..', () => ({
  players: {
    restrictions: { isActive: (r: PlayerBan, now?: Date) => isActive(r, now) },
  },
}))
vi.mock('./restriction-actors', () => ({ restrictionActors: vi.fn() }))
vi.mock('../../../html/bundle', () => ({ bundle: vi.fn() }))
vi.mock('../../../environment', () => ({ environment: {} }))
vi.mock('../../../configuration', () => ({ configuration: { get: vi.fn() } }))
vi.mock('../../player-gamemodes', () => ({ playerGamemodes: vi.fn() }))
vi.mock('../../../html/layout', () => ({ Layout: vi.fn() }))
vi.mock('../../../html/components/navigation-bar', () => ({ NavigationBar: vi.fn() }))
vi.mock('../../../html/components/footer', () => ({ Footer: vi.fn() }))

const player = { steamId: '76561198000000001' as SteamId64 }
const linkedPlayer = { ...player, etf2lProfile: { id: 123 } as never }
const admin = { steamId: '76561198000000002' as SteamId64, name: 'Admin' }
const actors = new Map([[admin.steamId, admin]])
const ban: PlayerBan = {
  actor: 'bot',
  start: subDays(new Date(), 1),
  end: addDays(new Date(), 1),
  reason: 'ETF2L.org: Cheating',
  source: 'etf2l',
}

function render(props: Partial<Parameters<typeof RestrictionDetails>[0]>) {
  return parse(
    RestrictionDetails({
      player: linkedPlayer,
      kind: 'ban',
      restriction: ban,
      actors,
      ...props,
    }) as string,
  )
}

describe('RestrictionDetails', () => {
  it('links the ETF2L badge to the league profile and keeps the bot issuer', () => {
    const root = render({})
    expect(root.querySelector('a')?.getAttribute('href')).toBe('https://etf2l.org/forum/user/123')
    expect(root.querySelector('a')?.text).toBe('synced from ETF2L.org')
    expect(root.text).toContain('by bot')
    expect(root.querySelector('button')).not.toBeNull()
  })

  it('renders plain badge text when no league profile exists', () => {
    const root = render({ player })
    expect(root.text).toContain('synced from ETF2L.org')
    expect(root.querySelector('a')).toBeNull()
  })

  it('marks local revocation without a revoke button', () => {
    const root = render({
      restriction: { ...ban, end: subDays(new Date(), 1), revokedLocally: true },
    })
    expect(root.text).toContain('(revoked locally)')
    expect(root.querySelector('button')).toBeNull()
  })

  it('links the admin who issued it', () => {
    const local = { ...ban, actor: admin.steamId }
    delete local.source
    const root = render({ restriction: local })
    expect(root.text).not.toContain('synced from ETF2L.org')
    expect(root.querySelector('a')?.getAttribute('href')).toBe(`/players/${admin.steamId}`)
  })

  it('points a chat mute revoke at the chat-mutes route', () => {
    const root = render({ kind: 'chatMute', restriction: { ...ban, actor: admin.steamId } })
    const button = root.querySelector('button')!
    expect(button.getAttribute('hx-put')).toBe(
      `/players/${player.steamId}/edit/chat-mutes/${ban.start.getTime().toString()}/revoke`,
    )
    expect(button.getAttribute('data-umami-event')).toBe('revoke-chat-mute')
    expect(button.text).toContain('Revoke mute')
  })
})
