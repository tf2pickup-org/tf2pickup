import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { schedule } from './schedule'
import { collections } from '../database/collections'
import { scheduledTaskTimers } from './scheduled-task-timers'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { GameNumber } from '../database/models/game.model'

const handler = vi.hoisted(() => vi.fn())
const insertedId = await vi.hoisted(async () => new (await import('mongodb')).ObjectId())

vi.mock('./tasks', () => ({
  tasks: { 'games.freePlayer': handler },
  tasksSchema: { parse: (doc: unknown) => doc },
}))

vi.mock('../database/collections', () => ({
  collections: {
    tasks: {
      insertOne: vi.fn(),
      findOneAndDelete: vi.fn(),
    },
  },
}))

vi.mock('../logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}))

let now: Date

beforeEach(() => {
  vi.useFakeTimers()
  now = new Date(2000, 1, 1, 13)
  vi.setSystemTime(now)

  scheduledTaskTimers.clear()
  vi.mocked(collections.tasks.insertOne).mockResolvedValue({ insertedId, acknowledged: true })
  vi.mocked(collections.tasks.findOneAndDelete).mockResolvedValue({
    name: 'games.freePlayer',
    args: { player: '76561198074409147' },
  })
})

afterEach(() => {
  scheduledTaskTimers.clear()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('schedule()', () => {
  it('should persist the task', async () => {
    await schedule('games.freePlayer', 5000, { player: '76561198074409147' as SteamId64 })
    expect(collections.tasks.insertOne).toHaveBeenCalledWith({
      name: 'games.freePlayer',
      at: new Date(now.getTime() + 5000),
      args: { player: '76561198074409147' },
    })
  })

  it('should run the task when its timer fires', async () => {
    await schedule('games.freePlayer', 5000, { player: '76561198074409147' as SteamId64 })
    expect(handler).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(5000)

    expect(collections.tasks.findOneAndDelete).toHaveBeenCalledWith({ _id: insertedId })
    expect(handler).toHaveBeenCalledWith({ player: '76561198074409147' })
    expect(scheduledTaskTimers.has(insertedId.toString())).toBe(false)
  })

  it('should throw when the task is not registered', async () => {
    await expect(
      schedule('mumble.cleanupChannel', 1000, { gameNumber: 1 as GameNumber }),
    ).rejects.toThrow('task not registered')
    expect(collections.tasks.insertOne).not.toHaveBeenCalled()
  })
})
