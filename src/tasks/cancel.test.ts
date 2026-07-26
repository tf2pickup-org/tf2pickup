import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { cancel } from './cancel'
import { collections } from '../database/collections'
import { scheduledTaskTimers } from './scheduled-task-timers'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { GameNumber } from '../database/models/game.model'

vi.mock('./tasks', () => ({
  tasks: { 'games.freePlayer': vi.fn() },
}))

vi.mock('../database/collections', () => ({
  collections: {
    tasks: {
      find: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2000, 1, 1, 13))
  scheduledTaskTimers.clear()
  vi.mocked(collections.tasks.find).mockReturnValue({
    toArray: () => Promise.resolve([]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
})

afterEach(() => {
  scheduledTaskTimers.clear()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('cancel()', () => {
  it('should throw when the task is not registered', async () => {
    await expect(cancel('mumble.cleanupChannel', { gameNumber: 1 as GameNumber })).rejects.toThrow(
      'task not registered',
    )
  })

  it('should delete matching tasks with flattened args', async () => {
    await cancel('games.freePlayer', { player: '76561198074409147' as SteamId64 })
    expect(collections.tasks.find).toHaveBeenCalledWith(
      { name: 'games.freePlayer', 'args.player': '76561198074409147' },
      { projection: { _id: 1 } },
    )
    expect(collections.tasks.deleteMany).toHaveBeenCalledWith({
      name: 'games.freePlayer',
      'args.player': '76561198074409147',
    })
  })

  it('should clear the in-memory timers of cancelled tasks', async () => {
    const _id = new ObjectId()
    const fn = vi.fn()
    scheduledTaskTimers.set(_id.toString(), setTimeout(fn, 5000))
    vi.mocked(collections.tasks.find).mockReturnValue({
      toArray: () => Promise.resolve([{ _id }]),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    await cancel('games.freePlayer', { player: '76561198074409147' as SteamId64 })

    expect(scheduledTaskTimers.has(_id.toString())).toBe(false)
    await vi.advanceTimersByTimeAsync(5000)
    expect(fn).not.toHaveBeenCalled()
  })
})
