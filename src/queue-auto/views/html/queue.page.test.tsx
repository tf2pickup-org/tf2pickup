import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../database/collections', () => ({
  collections: {
    queueSlots: { find: vi.fn() },
  },
}))

vi.mock('../../../environment', () => ({
  environment: {
    WEBSITE_NAME: 'tf2pickup.org',
    QUEUE_CONFIG: '6v6',
    LOG_LEVEL: 'info',
    NODE_ENV: 'test',
  },
}))

vi.mock('../../../events', () => ({
  events: {
    emit: vi.fn(),
    on: vi.fn(),
  },
}))

vi.mock('../../config', () => ({
  config: {
    classes: [],
  },
}))

vi.mock('@fastify/request-context', () => ({
  requestContext: {
    get: vi.fn(),
  },
}))

vi.mock('../../../players', () => ({
  players: {
    bySteamId: vi.fn(),
  },
}))

import { parse } from 'node-html-parser'
import { ClearQueueButton } from './queue.page'
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
