import { describe, expect, it } from 'vitest'
import { Gamemode } from '../shared/types/gamemode'
import { settingPage } from './setting-page'

const auto6v6 = { slug: 'sixes', launchMode: 'auto', gamemode: Gamemode.sixes } as const
const captainHl = { slug: 'hl', launchMode: 'captain', gamemode: Gamemode.highlander } as const

describe('settingPage()', () => {
  it('points a configuration key at its page', () => {
    expect(settingPage({ configKey: 'games.join_queue_cooldown' })).toBe('/admin/penalties')
  })

  it("points a queue setting at its queue's tab", () => {
    expect(settingPage({ queue: captainHl, field: 'pickTimeout' })).toBe('/admin/queues/hl/timers')
    expect(settingPage({ queue: auto6v6, field: 'name' })).toBe('/admin/queues/sixes')
  })

  it("has no page for a field the queue's page doesn't show", () => {
    expect(settingPage({ queue: auto6v6, field: 'pickTimeout' })).toBeNull()
    expect(settingPage({ queue: captainHl, field: 'skillThreshold' })).toBeNull()
  })

  it('has no page for settings only editable here', () => {
    expect(settingPage({ queue: auto6v6, field: 'mapCooldown' })).toBeNull()
  })
})

describe('settingPage() for configuration keys', () => {
  it.each([
    ['discord.guilds', '/admin/discord'],
    ['games.auto_force_end_threshold', '/admin/match-rules'],
    ['queue.pre_ready_up_timeout', '/admin/queues'],
    ['twitchtv.promoted_streams', '/admin/streams'],
  ] as const)('%s → %s', (configKey, page) => {
    expect(settingPage({ configKey })).toBe(page)
  })
})
