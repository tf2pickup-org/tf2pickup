import { beforeEach, describe, expect, it, vi } from 'vitest'

const listeners = vi.hoisted(() => new Map<string, (snapshot: unknown) => Promise<void>>())

vi.mock('../../events', () => ({
  events: {
    on: vi.fn((name: string, fn: (snapshot: unknown) => Promise<void>) => listeners.set(name, fn)),
  },
}))
vi.mock('../../logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }))
vi.mock('../launch-game', () => ({ launchGame: vi.fn() }))
vi.mock('../../queues/auto', () => ({ queueEngine: { launchFailed: vi.fn() } }))
vi.mock('../assign-game-server', () => ({ assignGameServer: vi.fn() }))
vi.mock('../rcon/configure', () => ({ configure: vi.fn() }))
vi.mock('../get-orphaned-games', () => ({ getOrphanedGames: vi.fn() }))
vi.mock('../../database/collections', () => ({ collections: {} }))

import { queueEngine } from '../../queues/auto'
import { launchGame } from '../launch-game'
import plugin from './launch-new-game'

beforeEach(async () => {
  vi.clearAllMocks()
  await (plugin as unknown as (app: unknown) => Promise<void>)({ addHook: vi.fn() })
})

describe('queue:launching', () => {
  it('launches an auto queue', async () => {
    await listeners.get('queue:launching')!({ queue: { launchMode: 'auto' } })
    expect(launchGame).toHaveBeenCalled()
  })

  it('ignores a captain queue', async () => {
    await listeners.get('queue:launching')!({ queue: { launchMode: 'captain' } })
    expect(launchGame).not.toHaveBeenCalled()
    expect(queueEngine.launchFailed).not.toHaveBeenCalled()
  })
})
