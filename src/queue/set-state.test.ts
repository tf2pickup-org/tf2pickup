import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../database/collections', () => ({
  collections: {
    queueState: {
      updateOne: vi.fn(),
    },
  },
}))

vi.mock('../configuration', () => ({
  configuration: { get: vi.fn() },
}))

vi.mock('../events', () => ({
  events: { emit: vi.fn() },
}))

vi.mock('../logger', () => ({
  logger: { trace: vi.fn(), info: vi.fn() },
}))

vi.mock('../queue-auto/is-launchable', () => ({
  isLaunchable: vi.fn(),
}))

vi.mock('../queue-auto/ready-up-pre-readied', () => ({
  readyUpPreReadied: vi.fn(),
}))

vi.mock('../queue-captain/is-launchable', () => ({
  isLaunchable: vi.fn(),
}))

vi.mock('../queue-captain/ready-up-pre-readied', () => ({
  readyUpPreReadied: vi.fn(),
}))

vi.mock('./with-queue-lock', () => ({
  withQueueLock: vi.fn(async (_operation: string, fn: () => Promise<unknown>) => await fn()),
}))

import { setState } from './set-state'
import { QueueState } from '../database/models/queue-state.model'
import { collections } from '../database/collections'
import { configuration } from '../configuration'
import { events } from '../events'
import { isLaunchable as autoIsLaunchable } from '../queue-auto/is-launchable'
import { readyUpPreReadied as autoReadyUpPreReadied } from '../queue-auto/ready-up-pre-readied'
import { isLaunchable as captainIsLaunchable } from '../queue-captain/is-launchable'
import { readyUpPreReadied as captainReadyUpPreReadied } from '../queue-captain/ready-up-pre-readied'

describe('setState()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(configuration.get).mockResolvedValue('auto' as never)
    vi.mocked(autoIsLaunchable).mockResolvedValue(true)
    vi.mocked(captainIsLaunchable).mockResolvedValue(true)
  })

  describe('when transitioning to launching', () => {
    it('rejects when the queue is not launchable', async () => {
      vi.mocked(autoIsLaunchable).mockResolvedValue(false)

      await expect(setState(QueueState.launching)).rejects.toThrow(
        'cannot launch: queue is no longer full and ready',
      )
      expect(collections.queueState.updateOne).not.toHaveBeenCalled()
      expect(events.emit).not.toHaveBeenCalled()
    })

    it('proceeds when the queue is launchable', async () => {
      await setState(QueueState.launching)

      expect(collections.queueState.updateOne).toHaveBeenCalledWith(
        {},
        { $set: { state: QueueState.launching } },
      )
      expect(events.emit).toHaveBeenCalledWith('queue/state:updated', {
        state: QueueState.launching,
      })
    })

    it('consults the captain draft in captain mode', async () => {
      vi.mocked(configuration.get).mockResolvedValue('captain' as never)
      vi.mocked(captainIsLaunchable).mockResolvedValue(false)

      await expect(setState(QueueState.launching)).rejects.toThrow(
        'cannot launch: queue is no longer full and ready',
      )
      expect(autoIsLaunchable).not.toHaveBeenCalled()
    })
  })

  describe('when transitioning to ready', () => {
    it('readies up pre-readied players from the queue slots in auto mode', async () => {
      await setState(QueueState.ready)

      expect(autoReadyUpPreReadied).toHaveBeenCalled()
      expect(captainReadyUpPreReadied).not.toHaveBeenCalled()
    })

    it('readies up pre-readied players from the captain queue in captain mode', async () => {
      vi.mocked(configuration.get).mockResolvedValue('captain' as never)

      await setState(QueueState.ready)

      expect(captainReadyUpPreReadied).toHaveBeenCalled()
      expect(autoReadyUpPreReadied).not.toHaveBeenCalled()
    })
  })

  it('does not verify launchability for other transitions', async () => {
    await setState(QueueState.waiting)

    expect(autoIsLaunchable).not.toHaveBeenCalled()
    expect(captainIsLaunchable).not.toHaveBeenCalled()
    expect(collections.queueState.updateOne).toHaveBeenCalledWith(
      {},
      { $set: { state: QueueState.waiting } },
    )
  })
})
