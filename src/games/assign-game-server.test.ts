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

vi.mock('../database/collections', () => ({
  collections: {
    games: {
      findOne: vi.fn().mockResolvedValue({ number: 1, map: 'cp_badlands' }),
    },
  },
}))

vi.mock('./update', () => ({
  update: vi.fn().mockResolvedValue({ number: 1, gameServer: { name: 'test' } }),
}))

vi.mock('../events', () => ({
  events: { emit: vi.fn() },
}))

vi.mock('../logger', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('../errors', () => ({
  errors: {
    badRequest: (msg: string) => new Error(msg),
    internalServerError: (msg: string) => new Error(msg),
  },
}))

vi.mock('../discord/notify-game-server-assignment-failed', () => ({
  notifyGameServerAssignmentFailed: vi.fn(),
}))

import { assignGameServer } from './assign-game-server'
import { tf2QuickServer } from '../tf2-quick-server'
import { staticGameServers } from '../static-game-servers'
import { servemeTf } from '../serveme-tf'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeServer = { id: 'srv', name: 'test', provider: 'tf2quickserver' } as any

describe('assignGameServer() with selected tf2QuickServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tf2QuickServer.assign).mockResolvedValue(fakeServer)
  })

  it('calls tf2QuickServer.assign with serverId when select is existing', async () => {
    await assignGameServer(1 as never, {
      selected: {
        provider: 'tf2QuickServer',
        server: { select: 'existing', serverId: 'server-abc123' },
      },
    })
    expect(tf2QuickServer.assign).toHaveBeenCalledWith({
      serverId: 'server-abc123',
      map: 'cp_badlands',
    })
    expect(staticGameServers.assign).not.toHaveBeenCalled()
    expect(servemeTf.assign).not.toHaveBeenCalled()
  })

  it('calls tf2QuickServer.assign with region when select is new', async () => {
    await assignGameServer(1 as never, {
      selected: { provider: 'tf2QuickServer', server: { select: 'new', region: 'eu-frankfurt-1' } },
    })
    expect(tf2QuickServer.assign).toHaveBeenCalledWith({
      region: 'eu-frankfurt-1',
      map: 'cp_badlands',
    })
  })
})

describe('assignGameServer() auto-assign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('tries static first', async () => {
    vi.mocked(staticGameServers.assign).mockResolvedValue(fakeServer)
    await assignGameServer(1 as never)
    expect(staticGameServers.assign).toHaveBeenCalled()
    expect(servemeTf.assign).not.toHaveBeenCalled()
    expect(tf2QuickServer.assign).not.toHaveBeenCalled()
  })

  it('falls back to serveme.tf when static is unavailable', async () => {
    vi.mocked(staticGameServers.assign).mockRejectedValue(new Error('no static servers'))
    vi.mocked(servemeTf.assign).mockResolvedValue(fakeServer)
    await assignGameServer(1 as never)
    expect(servemeTf.assign).toHaveBeenCalled()
    expect(tf2QuickServer.assign).not.toHaveBeenCalled()
  })

  it('falls back to tf2QuickServer when static and serveme.tf are unavailable', async () => {
    vi.mocked(staticGameServers.assign).mockRejectedValue(new Error('no static servers'))
    vi.mocked(servemeTf.assign).mockRejectedValue(new Error('no serveme.tf servers'))
    vi.mocked(tf2QuickServer.assign).mockResolvedValue(fakeServer)
    await assignGameServer(1 as never)
    expect(tf2QuickServer.assign).toHaveBeenCalled()
  })

  it('throws when all providers are unavailable', async () => {
    vi.mocked(staticGameServers.assign).mockRejectedValue(new Error('no static servers'))
    vi.mocked(servemeTf.assign).mockRejectedValue(new Error('no serveme.tf servers'))
    vi.mocked(tf2QuickServer.assign).mockRejectedValue(new Error('no quick servers'))
    await expect(assignGameServer(1 as never)).rejects.toThrow('no free servers available')
  })
})
