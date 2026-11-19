import { describe, expect, it, vi } from 'vitest'
import { secondsToMilliseconds } from 'date-fns'

const { calls, counted, pool } = vi.hoisted(() => {
  const calls = { count: 0 }
  return {
    calls,
    counted: (result: unknown) =>
      vi.fn(() => {
        calls.count++
        return Promise.resolve(result)
      }),
    pool: { members: [] as unknown[] },
  }
})

vi.mock('../../database/collections', () => ({
  collections: {
    players: { find: vi.fn(() => ({ toArray: counted([]) })) },
    captainPool: {
      findOne: counted(null),
      insertOne: counted(undefined),
      updateOne: counted(undefined),
      updateMany: counted(undefined),
      deleteOne: counted(undefined),
      find: vi.fn(() => ({
        toArray: () => {
          calls.count++
          return Promise.resolve(pool.members)
        },
      })),
    },
    queueSlots: { findOne: counted(null) },
    queueState: { updateOne: counted(undefined) },
  },
}))
vi.mock('../../pre-ready', () => ({ preReady: { start: vi.fn() } }))
vi.mock('../../tasks', () => ({
  tasks: { schedule: counted(undefined), cancel: counted(undefined) },
}))
vi.mock('../../logger', () => ({ logger: { info: vi.fn() } }))
vi.mock('../../players', () => ({
  players: {
    bySteamId: vi.fn(() => {
      calls.count++
      return Promise.resolve({ steamId: '76561198000000099', name: 'new', avatar: {} })
    }),
  },
}))
vi.mock('../../shared/player-avatar-url', () => ({ playerAvatarUrl: () => 'avatar' }))
vi.mock('../auto/join-blocker', () => ({ joinBlocker: vi.fn().mockReturnValue(null) }))
vi.mock('../get', () => ({
  get: vi.fn(() => {
    calls.count++
    return Promise.resolve({
      launchMode: 'captain',
      gamemode: '6v6',
      enabled: true,
      readyUpTimeout: secondsToMilliseconds(40),
      readyStateTimeout: secondsToMilliseconds(60),
    })
  }),
}))
vi.mock('../get-state', () => ({
  getState: vi.fn(() => {
    calls.count++
    return Promise.resolve('waiting')
  }),
}))
vi.mock('./leave-pools', () => ({
  leavePools: vi.fn(() => {
    calls.count++
    return Promise.resolve()
  }),
}))
vi.mock('../queue-command', () => ({
  queueCommand: vi.fn(
    async (_operation: string, fn: (emit: unknown) => unknown) => await fn(vi.fn()),
  ),
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { captainRoles } from './captain-roles'
import { roleKey } from './role-key'
import { toggleRole } from './toggle-role'

describe('toggleRole() query budget', () => {
  it('stays within 10 operations plus ready-entry lifecycle cost when the pool becomes full', async () => {
    const roles = captainRoles('6v6' as never).map(roleKey)
    // the last two are the medics, one of whom is the newcomer
    pool.members = Array.from({ length: 12 }, (_, index) => ({
      player: { steamId: `7656119800000${String(index).padStart(4, '0')}` },
      roles: index >= 10 ? ['medic:medic'] : roles.slice(0, 5),
      volunteer: index < 2,
      joinedAt: new Date(index),
    }))

    await toggleRole(new ObjectId() as QueueId, '76561198000000099' as SteamId64, 'medic:medic')

    expect(collections.queueState.updateOne).toHaveBeenCalled()
    // Ready entry adds the pre-ready lookup/update and two durable task inserts (SPEC9).
    expect(calls.count - 4).toBeLessThanOrEqual(10)
  })
})
