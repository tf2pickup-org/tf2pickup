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

vi.mock('../games', () => ({
  games: {
    update: vi.fn(),
  },
}))

import { assign } from './assign'
import { findFree } from './find-free'
import { createServer, listServers } from './client'
import { games } from '../games'
import type { GameNumber } from '../database/models/game.model'

const gameNumber = 1 as GameNumber

const freeServer = {
  serverId: 'existing-server-uuid',
  region: 'eu-west-1',
  variant: 'tf2pickup',
  hostIp: '1.2.3.4',
  hostPort: 27015,
  tvIp: '5.6.7.8',
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
    vi.mocked(games.update).mockResolvedValue(undefined as never)
  })

  describe('when no free server is available', () => {
    beforeEach(() => {
      vi.mocked(findFree).mockResolvedValue(null)
      vi.mocked(createServer).mockResolvedValue({ taskId: 'task-1234567890-abc123def' })
    })

    it('should persist a stub game server without blocking', async () => {
      await assign(gameNumber)
      const gameServer = vi.mocked(games.update).mock.calls[0][1].$set.gameServer
      expect(gameServer.provider).toBe(GameServerProvider.tf2QuickServer)
      expect(gameServer.id).toBe('task-1234567890-abc123def')
      expect(gameServer.address).toBe('')
    })

    it('should set pendingTaskId to the API task id', async () => {
      await assign(gameNumber)
      const gameServer = vi.mocked(games.update).mock.calls[0][1].$set.gameServer
      expect(gameServer.pendingTaskId).toBe('task-1234567890-abc123def')
    })

    it('should set the server name to "A new quick server"', async () => {
      await assign(gameNumber)
      const gameServer = vi.mocked(games.update).mock.calls[0][1].$set.gameServer
      expect(gameServer.name).toBe('A new quick server')
    })

    it('should not call waitForReady', async () => {
      await assign(gameNumber)
      expect(createServer).toHaveBeenCalledOnce()
    })
  })

  describe('when a free server is available', () => {
    beforeEach(() => {
      vi.mocked(findFree).mockResolvedValue(freeServer)
    })

    it('should persist the existing server directly', async () => {
      await assign(gameNumber)
      const gameServer = vi.mocked(games.update).mock.calls[0][1].$set.gameServer
      expect(gameServer.id).toBe('existing-server-uuid')
      expect(gameServer.address).toBe('1.2.3.4')
      expect(gameServer.stvAddress).toBe('5.6.7.8')
      expect(gameServer.stvPort).toBe(27020)
    })

    it('should not set pendingTaskId', async () => {
      await assign(gameNumber)
      const gameServer = vi.mocked(games.update).mock.calls[0][1].$set.gameServer
      expect(gameServer.pendingTaskId).toBeUndefined()
    })
  })

  describe('when a specific serverId is provided', () => {
    beforeEach(() => {
      vi.mocked(listServers).mockResolvedValue([freeServer])
    })

    it('should persist that server directly without calling findFree', async () => {
      await assign(gameNumber, { serverId: 'existing-server-uuid' })
      const gameServer = vi.mocked(games.update).mock.calls[0][1].$set.gameServer
      expect(gameServer.id).toBe('existing-server-uuid')
      expect(gameServer.address).toBe('1.2.3.4')
      expect(gameServer.stvAddress).toBe('5.6.7.8')
      expect(gameServer.stvPort).toBe(27020)
      expect(findFree).not.toHaveBeenCalled()
    })
  })

  describe('when a custom region is provided', () => {
    beforeEach(() => {
      vi.mocked(findFree).mockResolvedValue(null)
      vi.mocked(createServer).mockResolvedValue({ taskId: 'task-abc123' })
    })

    it('should create a server in the given region without calling findFree', async () => {
      await assign(gameNumber, { region: 'us-chicago-1' })
      expect(createServer).toHaveBeenCalledWith('us-chicago-1')
      expect(findFree).not.toHaveBeenCalled()
    })
  })
})
