import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { arm } from './arm'
import { collections } from '../database/collections'
import { logger } from '../logger'
import { scheduledTaskTimers } from './scheduled-task-timers'
import { taskExecutionCount } from './metrics'

const handler = vi.hoisted(() => vi.fn())

vi.mock('./tasks', () => ({
  tasks: { 'games.freePlayer': handler },
  tasksSchema: { parse: (doc: unknown) => doc },
}))

vi.mock('./metrics', () => ({
  taskExecutionCount: { add: vi.fn() },
  taskExecutionDuration: { record: vi.fn() },
}))

vi.mock('../database/collections', () => ({
  collections: {
    tasks: {
      findOneAndDelete: vi.fn(),
    },
  },
}))

vi.mock('../logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}))

let now: Date

function makeTask(at: Date) {
  return {
    _id: new ObjectId(),
    name: 'games.freePlayer' as const,
    at,
    args: { player: '76561198074409147' },
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  now = new Date(2000, 1, 1, 13)
  vi.setSystemTime(now)

  scheduledTaskTimers.clear()
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

describe('arm()', () => {
  it('should register a timer keyed by the task id', () => {
    const task = makeTask(new Date(now.getTime() + 5000))
    arm(task)
    expect(scheduledTaskTimers.has(task._id.toString())).toBe(true)
  })

  it('should run the task at its scheduled time and clean up', async () => {
    const task = makeTask(new Date(now.getTime() + 5000))
    arm(task)

    expect(handler).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5000)

    expect(collections.tasks.findOneAndDelete).toHaveBeenCalledWith({ _id: task._id })
    expect(handler).toHaveBeenCalledWith({ player: '76561198074409147' })
    expect(scheduledTaskTimers.has(task._id.toString())).toBe(false)
    expect(taskExecutionCount.add).toHaveBeenCalledWith(1, {
      name: 'games.freePlayer',
      result: 'success',
    })
  })

  it('should run past-due tasks immediately', async () => {
    const task = makeTask(new Date(now.getTime() - 5000))
    arm(task)

    await vi.advanceTimersByTimeAsync(0)
    expect(handler).toHaveBeenCalledWith({ player: '76561198074409147' })
  })

  it('should not run the task when it was already claimed', async () => {
    vi.mocked(collections.tasks.findOneAndDelete).mockResolvedValue(null)
    const task = makeTask(new Date(now.getTime() + 5000))
    arm(task)

    await vi.advanceTimersByTimeAsync(5000)
    expect(handler).not.toHaveBeenCalled()
  })

  it('should catch and log handler errors', async () => {
    handler.mockRejectedValueOnce(new Error('boom'))
    const task = makeTask(new Date(now.getTime() + 5000))
    arm(task)

    await vi.advanceTimersByTimeAsync(5000)
    expect(logger.error).toHaveBeenCalled()
    expect(taskExecutionCount.add).toHaveBeenCalledWith(1, {
      name: 'games.freePlayer',
      result: 'error',
    })
  })
})
