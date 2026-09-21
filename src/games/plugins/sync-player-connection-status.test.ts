import fastify from 'fastify'
import { beforeEach, expect, it, vi } from 'vitest'
import { GameState } from '../../database/models/game.model'
import syncPlayerConnectionStatusPlugin from './sync-player-connection-status'

const mockFind = vi.hoisted(() => vi.fn())
vi.mock('../../database/collections', () => ({
  collections: { games: { find: mockFind } },
}))

const mockSyncPlayerConnectionStatus = vi.hoisted(() => vi.fn())
vi.mock('../sync-player-connection-status', () => ({
  syncPlayerConnectionStatus: mockSyncPlayerConnectionStatus,
}))

const mockLogError = vi.hoisted(() => vi.fn())
vi.mock('../../utils/log-error', () => ({ logError: mockLogError }))

let onListen: () => void
let hookName: string

beforeEach(() => {
  vi.clearAllMocks()
  mockFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue([{ number: 42 }]) })

  syncPlayerConnectionStatusPlugin({
    addHook: vi.fn((name, hook) => {
      hookName = name
      onListen = hook
    }),
  } as never)
})

it('finishes plugin registration before checking running games', async () => {
  const app = fastify()
  await app.register(syncPlayerConnectionStatusPlugin)
  await app.ready()

  expect(mockFind).toHaveBeenCalledTimes(0)
  await app.close()
})

it('does not wait for a game server status check during startup', async () => {
  mockSyncPlayerConnectionStatus.mockReturnValue(new Promise<void>(() => undefined))

  expect(hookName).toBe('onListen')
  expect(onListen()).toBeUndefined()

  await vi.waitFor(() => expect(mockSyncPlayerConnectionStatus).toHaveBeenCalledWith(42))
  expect(mockFind).toHaveBeenCalledWith(
    { state: { $in: [GameState.launching, GameState.started] }, gameServer: { $exists: true } },
    { projection: { number: 1 } },
  )
})

it('logs a failed startup reconciliation without rejecting startup', async () => {
  const error = new Error('database unavailable')
  mockFind.mockReturnValue({ toArray: vi.fn().mockRejectedValue(error) })

  expect(onListen()).toBeUndefined()

  await vi.waitFor(() => expect(mockLogError).toHaveBeenCalledWith(error))
})
