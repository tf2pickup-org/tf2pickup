import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MongoServerError, ObjectId } from 'mongodb'
import type { CaptainLaunchSnapshot } from '../queues/captain/types/captain-launch-snapshot'
import { collections } from '../database/collections'
import { events } from '../events'
import { insertGame } from './insert-game'
import { createCaptainGame } from './create-captain-game'

vi.mock('../database/collections', () => ({ collections: { games: { findOne: vi.fn() } } }))
vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('../queues/resolve-whitelist-id', () => ({
  resolveWhitelistId: vi.fn().mockResolvedValue('42'),
}))
vi.mock('./insert-game', () => ({ insertGame: vi.fn().mockResolvedValue({ insertedId: 'id' }) }))
// Any accidental balancing/skill lookup must fail this test.
vi.mock('../players', () => ({
  players: {
    bySteamId: vi.fn(() => {
      throw new Error('skill lookup')
    }),
  },
}))
vi.mock('./pick-teams', () => ({
  pickTeams: vi.fn(() => {
    throw new Error('balance search')
  }),
}))
const snapshot = {
  queue: {
    _id: new ObjectId(),
    launchMode: 'captain',
    gamemode: '6v6',
    maps: [{ name: 'cp_a', execConfig: 'sixes.cfg' }],
  },
  token: 'draft-token',
  map: 'cp_a',
  captains: { red: 'red', blu: 'blu' },
  slots: [{ id: 'red-scout-1', player: 'red', team: 'red', gameClass: 'scout', skill: 999 }],
} as unknown as CaptainLaunchSnapshot
const game = { ...snapshot, number: 42, launchMode: 'captain' }

beforeEach(() => vi.clearAllMocks())

describe('createCaptainGame()', () => {
  it('preserves drafted teams, records original captains and strips skill without balancing', async () => {
    vi.mocked(collections.games.findOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(game as never)
    expect(await createCaptainGame(snapshot)).toBe(game)
    expect(insertGame).toHaveBeenCalledWith(
      expect.objectContaining({
        queue: snapshot.queue._id,
        launchMode: 'captain',
        captains: snapshot.captains,
        captainDraftToken: snapshot.token,
        map: 'cp_a',
        execConfig: 'sixes.cfg',
        whitelistId: '42',
        slots: [expect.objectContaining({ player: 'red', team: 'red', gameClass: 'scout' })],
      }),
    )
    const inserted = vi.mocked(insertGame).mock.calls[0]![0]
    expect(inserted.slots[0]).not.toHaveProperty('skill')
    expect(events.emit).toHaveBeenCalledWith('game:created', { game })
    expect(events.emit).toHaveBeenCalledWith('queue/captainGame:created', { game })
  })

  it('reuses a previously created game without replaying global creation effects', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValueOnce(game as never)
    await createCaptainGame(snapshot)
    expect(insertGame).not.toHaveBeenCalled()
    expect(events.emit).toHaveBeenCalledExactlyOnceWith('queue/captainGame:created', { game })
  })

  it('recovers a concurrent insert through the unique draft correlation index', async () => {
    vi.mocked(collections.games.findOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(game as never)
    vi.mocked(insertGame).mockRejectedValueOnce(
      new MongoServerError({ code: 11000, keyPattern: { captainDraftToken: 1 } }),
    )
    expect(await createCaptainGame(snapshot)).toBe(game)
    expect(events.emit).toHaveBeenCalledExactlyOnceWith('queue/captainGame:created', { game })
  })

  it('propagates creation failures for pool restoration and refuses auto queues', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValueOnce(null)
    vi.mocked(insertGame).mockRejectedValueOnce(new Error('storage unavailable'))
    await expect(createCaptainGame(snapshot)).rejects.toThrow('storage unavailable')
    await expect(
      createCaptainGame({ ...snapshot, queue: { ...snapshot.queue, launchMode: 'auto' } }),
    ).rejects.toThrow('not a captain queue')
  })
})
