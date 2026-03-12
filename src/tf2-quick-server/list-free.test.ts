import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./client', () => ({
  listServers: vi.fn(),
}))

vi.mock('../database/collections', () => ({
  collections: {
    games: {
      find: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    },
  },
}))

import { listFree } from './list-free'
import { listServers } from './client'
import { collections } from '../database/collections'

const serverA = {
  serverId: 'server-aaa',
  status: 'ready' as const,
  region: 'eu-frankfurt-1',
  variant: 'tf2pickup',
  hostIp: '1.1.1.1',
  hostPort: 27015,
  tvIp: '1.1.1.1',
  tvPort: 27020,
  rconPassword: 'pass',
  hostPassword: 'host',
  rconAddress: '1.1.1.1',
  tvPassword: 'tv',
  logSecret: 1,
}

const serverB = {
  ...serverA,
  serverId: 'server-bbb',
  hostIp: '2.2.2.2',
  rconAddress: '2.2.2.2',
  tvIp: '2.2.2.2',
}

const serverPending = {
  ...serverA,
  serverId: 'server-ccc',
  status: 'pending' as const,
}

describe('listFree()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(collections.games.find).mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it('returns all ready servers when none are in use', async () => {
    vi.mocked(listServers).mockResolvedValue([serverA, serverB])
    const result = await listFree()
    expect(result).toHaveLength(2)
    expect(result.map(s => s.serverId)).toEqual(['server-aaa', 'server-bbb'])
  })

  it('excludes servers assigned to active games', async () => {
    vi.mocked(listServers).mockResolvedValue([serverA, serverB])
    vi.mocked(collections.games.find).mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ gameServer: { id: 'server-aaa' } }]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const result = await listFree()
    expect(result).toHaveLength(1)
    expect(result[0]!.serverId).toBe('server-bbb')
  })

  it('excludes non-ready servers', async () => {
    vi.mocked(listServers).mockResolvedValue([serverA, serverPending])
    const result = await listFree()
    expect(result).toHaveLength(1)
    expect(result[0]!.serverId).toBe('server-aaa')
  })

  it('returns empty array when no servers are available', async () => {
    vi.mocked(listServers).mockResolvedValue([])
    const result = await listFree()
    expect(result).toEqual([])
  })
})
