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

vi.mock('../games', () => ({
  games: {
    update: vi.fn().mockResolvedValue({ number: 1, gameServer: { name: 'test' } }),
    findOne: vi.fn(),
  },
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

import { assign } from './assign'
import { tf2QuickServer } from '../tf2-quick-server'
import { staticGameServers } from '../static-game-servers'
import { servemeTf } from '../serveme-tf'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeGame = { number: 1, map: 'cp_badlands' } as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeServer = { id: 'srv', name: 'test', provider: 'tf2quickserver' } as any

describe('assign() with selected tf2QuickServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(tf2QuickServer.assign).mockResolvedValue(fakeServer)
  })

  it('calls tf2QuickServer.assign with serverId when value is tf2QuickServer:{id}', async () => {
    await assign(fakeGame, 'tf2QuickServer:server-abc123')
    expect(tf2QuickServer.assign).toHaveBeenCalledWith({
      serverId: 'server-abc123',
      map: 'cp_badlands',
    })
    expect(staticGameServers.assign).not.toHaveBeenCalled()
    expect(servemeTf.assign).not.toHaveBeenCalled()
  })

  it('calls tf2QuickServer.assign with region when value is tf2QuickServer:new:{region}', async () => {
    await assign(fakeGame, 'tf2QuickServer:new:eu-frankfurt-1')
    expect(tf2QuickServer.assign).toHaveBeenCalledWith({
      region: 'eu-frankfurt-1',
      map: 'cp_badlands',
    })
  })

  it('throws for unknown game server selection', async () => {
    await expect(assign(fakeGame, 'unknown:foo')).rejects.toThrow('unknown game server selection')
  })
})
