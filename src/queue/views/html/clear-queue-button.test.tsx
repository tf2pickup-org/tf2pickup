import { describe, it, expect } from 'vitest'
import { parse } from 'node-html-parser'
import { ClearQueueButton } from './clear-queue-button'
import { PlayerRole } from '../../../database/models/player.model'
import type { User } from '../../../auth/types/user'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

const adminUser: User = {
  player: {
    steamId: '76561198000000001' as SteamId64,
    roles: [PlayerRole.admin],
    name: 'Admin',
    avatar: { medium: '' },
    preferences: {},
    hasAcceptedRules: true,
  },
}

const regularUser: User = {
  player: {
    ...adminUser.player,
    roles: [],
  },
}

describe('ClearQueueButton', () => {
  it('renders the button for admins', async () => {
    const html = await ClearQueueButton({ actor: adminUser })
    const root = parse(html)
    const button = root.querySelector('[hx-delete="/queue/players"]')
    expect(button).not.toBeNull()
  })

  it('does not render for non-admins', async () => {
    const html = await ClearQueueButton({ actor: regularUser })
    const root = parse(html)
    expect(root.querySelector('[hx-delete="/queue/players"]')).toBeNull()
  })

  it('does not render when there is no actor', async () => {
    const html = await ClearQueueButton({ actor: undefined })
    const root = parse(html)
    expect(root.querySelector('[hx-delete="/queue/players"]')).toBeNull()
  })
})
