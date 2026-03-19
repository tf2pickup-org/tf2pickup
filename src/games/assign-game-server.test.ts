import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../tf2-quick-server', () => ({
  tf2QuickServer: {
    assign: vi.fn(),
  },
}))

vi.mock('../static-game-servers', () => ({
  staticGameServers: {
    assign: vi.fn(),
  },
}))

vi.mock('../serveme-tf', () => ({
  servemeTf: {
    assign: vi.fn(),
  },
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), trace: vi.fn() },
}))

vi.mock('../errors', () => ({
  errors: {
    badRequest: (msg: string) => new Error(msg),
    internalServerError: (msg: string) => new Error(msg),
  },
}))

import { assignGameServer } from './assign-game-server'
import { tf2QuickServer } from '../tf2-quick-server'
import { staticGameServers } from '../static-game-servers'
import { servemeTf } from '../serveme-tf'
import type { GameNumber } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'

const gameNumber = 1 as GameNumber
const actor = '76561198000000000' as SteamId64

describe('assignGameServer()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('without select (auto-assign)', () => {
    it('assigns static server when available', async () => {
      vi.mocked(staticGameServers.assign).mockResolvedValue(undefined)
      await assignGameServer(gameNumber)
      expect(staticGameServers.assign).toHaveBeenCalledWith(gameNumber)
      expect(servemeTf.assign).not.toHaveBeenCalled()
      expect(tf2QuickServer.assign).not.toHaveBeenCalled()
    })

    it('falls back to servemeTf when static throws', async () => {
      vi.mocked(staticGameServers.assign).mockRejectedValue(new Error('no static server'))
      vi.mocked(servemeTf.assign).mockResolvedValue(undefined)
      await assignGameServer(gameNumber)
      expect(servemeTf.assign).toHaveBeenCalledWith(gameNumber)
      expect(tf2QuickServer.assign).not.toHaveBeenCalled()
    })

    it('falls back to tf2QuickServer when static and servemeTf throw', async () => {
      vi.mocked(staticGameServers.assign).mockRejectedValue(new Error('no static server'))
      vi.mocked(servemeTf.assign).mockRejectedValue(new Error('no serveme server'))
      vi.mocked(tf2QuickServer.assign).mockResolvedValue(undefined)
      await assignGameServer(gameNumber)
      expect(tf2QuickServer.assign).toHaveBeenCalledWith(gameNumber)
    })

    it('throws when all providers fail', async () => {
      vi.mocked(staticGameServers.assign).mockRejectedValue(new Error('no static server'))
      vi.mocked(servemeTf.assign).mockRejectedValue(new Error('no serveme server'))
      vi.mocked(tf2QuickServer.assign).mockRejectedValue(new Error('no quick server'))
      await expect(assignGameServer(gameNumber)).rejects.toThrow('no servers available')
    })
  })

  describe('with select (admin-selected)', () => {
    it('calls staticGameServers.assign for static selection', async () => {
      vi.mocked(staticGameServers.assign).mockResolvedValue(undefined)
      await assignGameServer(gameNumber, {
        selected: { provider: 'static', id: 'server-id-123' },
        actor,
      })
      expect(staticGameServers.assign).toHaveBeenCalledWith(gameNumber, 'server-id-123', actor)
    })

    it('calls servemeTf.assign for servemeTf selection', async () => {
      vi.mocked(servemeTf.assign).mockResolvedValue(undefined)
      await assignGameServer(gameNumber, {
        selected: { provider: 'servemeTf', name: 'my-server' },
        actor,
      })
      expect(servemeTf.assign).toHaveBeenCalledWith(gameNumber, 'my-server', actor)
    })

    it('calls tf2QuickServer.assign with serverId for existing server selection', async () => {
      vi.mocked(tf2QuickServer.assign).mockResolvedValue(undefined)
      await assignGameServer(gameNumber, {
        selected: {
          provider: 'tf2QuickServer',
          server: { select: 'existing', serverId: 'server-abc123' },
        },
        actor,
      })
      expect(tf2QuickServer.assign).toHaveBeenCalledWith(
        gameNumber,
        { serverId: 'server-abc123' },
        actor,
      )
    })

    it('calls tf2QuickServer.assign with region for new server selection', async () => {
      vi.mocked(tf2QuickServer.assign).mockResolvedValue(undefined)
      await assignGameServer(gameNumber, {
        selected: {
          provider: 'tf2QuickServer',
          server: { select: 'new', region: 'eu-frankfurt-1' },
        },
        actor,
      })
      expect(tf2QuickServer.assign).toHaveBeenCalledWith(
        gameNumber,
        { region: 'eu-frankfurt-1' },
        actor,
      )
    })
  })
})
