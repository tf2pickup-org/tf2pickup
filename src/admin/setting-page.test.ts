import { describe, expect, it } from 'vitest'
import { settingPage } from './setting-page'

describe('settingPage()', () => {
  it('points a configuration key at its page', () => {
    expect(settingPage({ configKey: 'games.join_queue_cooldown' })).toBe('/admin/penalties')
  })

  it("points a queue setting at its queue's tab", () => {
    expect(settingPage({ queueSlug: 'hl', field: 'pickTimeout' })).toBe('/admin/queues/hl/timers')
    expect(settingPage({ queueSlug: 'hl', field: 'name' })).toBe('/admin/queues/hl')
  })

  it('has no page for settings only editable here', () => {
    expect(settingPage({ queueSlug: 'hl', field: 'mapCooldown' })).toBeNull()
  })
})
