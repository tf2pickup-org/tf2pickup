import { ObjectId } from 'mongodb'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({ collections: { queueState: { findOne: vi.fn() } } }))
vi.mock('../get', () => ({ get: vi.fn().mockResolvedValue('settings') }))
vi.mock('./get-slots', () => ({ getSlots: vi.fn().mockResolvedValue('slots') }))
vi.mock('./get-map-winner', () => ({ getMapWinner: vi.fn().mockResolvedValue('cp_a') }))
vi.mock('./get-friends', () => ({ getFriends: vi.fn().mockResolvedValue('friends') }))

import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { takeLaunchSnapshot } from './take-launch-snapshot'

const queue = new ObjectId() as QueueId

describe('takeLaunchSnapshot()', () => {
  it('carries the launch token stamped on the queue, so a replayed launch finds its game', async () => {
    vi.mocked(collections.queueState.findOne).mockResolvedValue({ launchToken: 't' } as never)
    expect(await takeLaunchSnapshot(queue)).toEqual({
      queue: 'settings',
      token: 't',
      slots: 'slots',
      map: 'cp_a',
      friends: 'friends',
    })
  })

  it('refuses a launching queue without a token', async () => {
    vi.mocked(collections.queueState.findOne).mockResolvedValue({} as never)
    await expect(takeLaunchSnapshot(queue)).rejects.toThrow('no launch token')
  })
})
