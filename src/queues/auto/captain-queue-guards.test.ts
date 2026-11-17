import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../database/collections', () => ({
  collections: {
    queueSlots: {
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      find: vi.fn(() => ({ toArray: () => Promise.resolve([]) })),
    },
    queueMapOptions: { countDocuments: vi.fn().mockResolvedValue(1) },
    queueMapVotes: { deleteOne: vi.fn(), findOneAndUpdate: vi.fn(), deleteMany: vi.fn() },
    queueFriends: { findOne: vi.fn(), updateOne: vi.fn() },
  },
}))
vi.mock('../../logger', () => ({ logger: { trace: vi.fn(), info: vi.fn() } }))
vi.mock('../../pre-ready', () => ({ preReady: { start: vi.fn(), cancel: vi.fn() } }))
vi.mock('../get', () => ({ get: vi.fn().mockResolvedValue({ launchMode: 'captain' }) }))
vi.mock('../get-state', () => ({ getState: vi.fn().mockResolvedValue('ready') }))
vi.mock('./get-map-vote-results', () => ({ getMapVoteResults: vi.fn() }))
vi.mock('./queue-command', () => ({
  queueCommand: vi.fn(
    async (_operation: string, fn: (emit: unknown) => unknown) => await fn(vi.fn()),
  ),
}))

import { ObjectId } from 'mongodb'
import { collections } from '../../database/collections'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { leave } from './leave'
import { markAsFriend } from './mark-as-friend'
import { readyUp } from './ready-up'
import { voteMap } from './vote-map'

const steamId = '76561198000000001' as SteamId64

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(collections.queueSlots.findOne).mockResolvedValue({
    queue: new ObjectId(),
    player: { steamId },
  } as never)
})

describe('auto commands on a captain queue', () => {
  it.each([
    ['readyUp', () => readyUp(steamId)],
    ['voteMap', () => voteMap(steamId, 'cp_process_f12')],
    ['markAsFriend', () => markAsFriend(steamId, null)],
    ['leave', () => leave(steamId)],
  ])('%s is rejected without changing anything', async (_name, run) => {
    await expect(run()).rejects.toThrow('not an auto queue')
    expect(collections.queueSlots.findOneAndUpdate).not.toHaveBeenCalled()
    expect(collections.queueMapVotes.findOneAndUpdate).not.toHaveBeenCalled()
    expect(collections.queueFriends.updateOne).not.toHaveBeenCalled()
  })
})
