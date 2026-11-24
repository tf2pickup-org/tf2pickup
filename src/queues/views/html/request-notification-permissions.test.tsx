import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../html/bundle', () => ({
  bundle: vi.fn().mockResolvedValue('/bundle.js'),
}))

import { RequestNotificationPermissions } from './request-notification-permissions'

describe('RequestNotificationPermissions', () => {
  it('tells the player how to re-enable blocked notifications', async () => {
    const html = String(await RequestNotificationPermissions())
    const denied = html.slice(html.indexOf('notifications-permission-denied'))
    expect(denied).toContain("browser's site settings")
  })
})
