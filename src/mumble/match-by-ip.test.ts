import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { SlotStatus } from '../database/models/game-slot.model'
import { MumbleVerificationMethod } from '../database/models/player.model'

const mocks = vi.hoisted(() => ({
  users: [] as { session: number; name: string; hash?: string; address?: string }[],
  bound: [] as string[],
  connections: [] as string[],
  certificates: {} as Record<string, unknown>,
}))

vi.mock('./client', () => ({
  client: {
    self: { session: 0 },
    users: {
      findAll: (predicate: (user: unknown) => boolean) =>
        mocks.users
          .map(user => ({ ...user, fetchAddress: () => Promise.resolve(user.address) }))
          .map(user => Object.assign(user, { sendMessage: sendMessage }))
          .filter(predicate),
    },
  },
}))
vi.mock('../database/collections', () => ({
  collections: {
    players: {
      find: () => ({
        project: () => ({
          toArray: () =>
            Promise.resolve(mocks.bound.map(hash => ({ mumbleCertificate: { hash } }))),
        }),
      }),
    },
    games: {
      find: () => ({
        toArray: () =>
          Promise.resolve([
            {
              number: 1,
              slots: ['a', 'b', 'c'].map(player => ({ player, status: SlotStatus.active })),
            },
          ]),
      }),
    },
    playerActions: { distinct: () => Promise.resolve(mocks.connections) },
  },
}))
vi.mock('../players', () => ({
  players: {
    bySteamId: (steamId: string) =>
      Promise.resolve({
        steamId,
        name: `<${steamId}>`,
        mumbleCertificate: mocks.certificates[steamId],
      }),
  },
}))
vi.mock('./bind-certificate', () => ({
  bindCertificate: vi.fn().mockResolvedValue({ outcome: 'bound' }),
}))
vi.mock('./verification-count', () => ({ verificationCount: { add: vi.fn() } }))
vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }))

const sendMessage = vi.fn()

import { matchByIp } from './match-by-ip'
import { bindCertificate } from './bind-certificate'
import { verificationCount } from './verification-count'

const ip = '1.2.3.4'

describe('matchByIp()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.users = [{ session: 1, name: 'mumble a', hash: 'hash-a', address: ip }]
    mocks.bound = []
    mocks.connections = []
    mocks.certificates = {}
  })

  it('binds the only session to the only player who just connected', async () => {
    await matchByIp(ip, 'a' as SteamId64)
    expect(bindCertificate).toHaveBeenCalledWith('a', 'hash-a', MumbleVerificationMethod.ipMatch)
    expect(sendMessage).toHaveBeenCalledWith("You're verified as &lt;a>.")
  })

  it('binds a player who connected to the game server earlier', async () => {
    mocks.connections = ['b']
    await matchByIp(ip)
    expect(bindCertificate).toHaveBeenCalledWith('b', 'hash-a', MumbleVerificationMethod.ipMatch)
  })

  it('ignores players who are not in a live game', async () => {
    mocks.connections = ['z']
    await matchByIp(ip)
    expect(bindCertificate).not.toHaveBeenCalled()
  })

  it('ignores players who already have a certificate', async () => {
    mocks.certificates = { a: { hash: 'old' } }
    await matchByIp(ip, 'a' as SteamId64)
    expect(bindCertificate).not.toHaveBeenCalled()
  })

  it('ignores sessions that are bound, have no certificate or another address', async () => {
    mocks.users = [
      { session: 1, name: 'bound', hash: 'hash-a', address: ip },
      { session: 2, name: 'no cert', address: ip },
      { session: 3, name: 'elsewhere', hash: 'hash-c', address: '5.6.7.8' },
    ]
    mocks.bound = ['hash-a']
    await matchByIp(ip, 'a' as SteamId64)
    expect(bindCertificate).not.toHaveBeenCalled()
    expect(verificationCount.add).not.toHaveBeenCalled()
  })

  it('leaves two players behind one address unbound', async () => {
    mocks.connections = ['b']
    await matchByIp(ip, 'a' as SteamId64)
    expect(bindCertificate).not.toHaveBeenCalled()
    expect(verificationCount.add).toHaveBeenCalledWith(1, {
      method: MumbleVerificationMethod.ipMatch,
      outcome: 'ambiguous',
    })
  })

  it('leaves two sessions behind one address unbound', async () => {
    mocks.users.push({ session: 2, name: 'mumble b', hash: 'hash-b', address: ip })
    await matchByIp(ip, 'a' as SteamId64)
    expect(bindCertificate).not.toHaveBeenCalled()
  })
})
