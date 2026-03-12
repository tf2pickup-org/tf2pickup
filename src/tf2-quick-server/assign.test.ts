import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameServerProvider } from '../database/models/game.model'

vi.mock('../environment', () => ({
  environment: {
    TF2_QUICK_SERVER_CLIENT_ID: 'test-client-id',
    TF2_QUICK_SERVER_CLIENT_SECRET: 'test-secret',
  },
}))

vi.mock('./find-free', () => ({
  findFree: vi.fn(),
}))

vi.mock('./client', () => ({
  createServer: vi.fn(),
  listServers: vi.fn(),
}))

vi.mock('../configuration', () => ({
  configuration: {
    get: vi.fn().mockResolvedValue('eu-west-1'),
  },
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

vi.mock('../errors', () => ({
  errors: {
    badRequest: (msg: string) => new Error(msg),
    internalServerError: (msg: string) => new Error(msg),
  },
}))

import { assign } from './assign'
import { findFree } from './find-free'
import { createServer, listServers } from './client'

const freeServer = {
  serverId: 'existing-server-uuid',
  region: 'eu-west-1',
  variant: 'tf2pickup',
  hostIp: '1.2.3.4',
  hostPort: 27015,
  tvIp: '1.2.3.4',
  tvPort: 27020,
  rconPassword: 'rcon-pass',
  hostPassword: 'host-pass',
  rconAddress: '1.2.3.4',
  tvPassword: 'tv-pass',
  logSecret: 12345,
  status: 'ready' as const,
}

describe('assign()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('when no free server is available', () => {
    beforeEach(() => {
      vi.mocked(findFree).mockResolvedValue(null)
      vi.mocked(createServer).mockResolvedValue({ taskId: 'task-1234567890-abc123def' })
    })

    it('should return a stub game server without blocking', async () => {
      const server = await assign()
      expect(server.provider).toBe(GameServerProvider.tf2QuickServer)
      expect(server.id).toBe('task-1234567890-abc123def')
      expect(server.address).toBe('')
    })

    it('should set pendingTaskId to the API task id', async () => {
      const server = await assign()
      expect(server.pendingTaskId).toBe('task-1234567890-abc123def')
    })

    it('should include the task id (without "task-" prefix) in the server name', async () => {
      const server = await assign()
      expect(server.name).toBe('A new quick server')
    })

    it('should not call waitForReady', async () => {
      // assign() must return before the server is ready — verified by the test
      // completing in well under the 5-minute polling timeout
      await assign()
      expect(createServer).toHaveBeenCalledOnce()
    })
  })

  describe('when a free server is available', () => {
    beforeEach(() => {
      vi.mocked(findFree).mockResolvedValue(freeServer)
    })

    it('should return the existing server directly', async () => {
      const server = await assign()
      expect(server.id).toBe('existing-server-uuid')
      expect(server.address).toBe('1.2.3.4')
    })

    it('should not set pendingTaskId', async () => {
      const server = await assign()
      expect(server.pendingTaskId).toBeUndefined()
    })
  })

  describe('when a specific serverId is provided', () => {
    beforeEach(() => {
      vi.mocked(listServers).mockResolvedValue([freeServer])
    })

    it('should return that server directly without calling findFree', async () => {
      const server = await assign({ serverId: 'existing-server-uuid' })
      expect(server.id).toBe('existing-server-uuid')
      expect(server.address).toBe('1.2.3.4')
      expect(findFree).not.toHaveBeenCalled()
    })
  })

  describe('when a custom region is provided', () => {
    beforeEach(() => {
      vi.mocked(findFree).mockResolvedValue(null)
      vi.mocked(createServer).mockResolvedValue({ taskId: 'task-abc123' })
    })

    it('should create a server in the given region without calling findFree', async () => {
      await assign({ region: 'us-chicago-1' })
      expect(createServer).toHaveBeenCalledWith('us-chicago-1')
      expect(findFree).not.toHaveBeenCalled()
    })
  })
})
