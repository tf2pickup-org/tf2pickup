import { Mutex } from 'async-mutex'
import { performance } from 'node:perf_hooks'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { events, type Events } from '../../events'
import { getState } from '../get-state'
import { queueMutexHoldDuration, queueMutexWaitDuration } from '../metrics'
import { decide } from './decide'
import { enterState } from './enter-state'

export type Emit = <K extends keyof Events>(event: K, params: Events[K]) => void
type PendingEvent = { [K in keyof Events]: [K, Events[K]] }[keyof Events]

// ponytail: one lock for every queue (ADR-0002); per-queue locks if the wait metric climbs
const mutex = new Mutex()

// Runs fn in the queue engine's critical section; fn must not call queueCommand() itself. Every
// queue whose slots fn changed has its state re-evaluated in the same critical section; events are
// collected and emitted once the lock is released.
export async function queueCommand<T>(
  operation: string,
  fn: (emit: Emit) => Promise<T>,
): Promise<T> {
  const pending: PendingEvent[] = []
  const emit: Emit = (event, params) => {
    pending.push([event, params] as PendingEvent)
  }

  const waitStart = performance.now()
  try {
    return await mutex.runExclusive(async () => {
      const holdStart = performance.now()
      queueMutexWaitDuration.record(holdStart - waitStart, { operation })
      try {
        return await fn(emit)
      } finally {
        // a command that fails midway may have changed slots already
        for (const queue of changedQueues(pending)) {
          await advance(queue, emit)
        }
        queueMutexHoldDuration.record(performance.now() - holdStart, { operation })
      }
    })
  } finally {
    flush(pending)
  }
}

function changedQueues(pending: PendingEvent[]): QueueId[] {
  const queues = new Map<string, QueueId>()
  for (const [event, params] of pending) {
    if (event === 'queue/slots:updated') {
      queues.set(params.queue.toHexString(), params.queue)
    }
  }
  return [...queues.values()]
}

async function advance(queue: QueueId, emit: Emit) {
  for (;;) {
    const [state, players, ready, slots] = await Promise.all([
      getState(queue),
      collections.queueSlots.countDocuments({ queue, player: { $ne: null } }),
      collections.queueSlots.countDocuments({ queue, ready: { $eq: true } }),
      collections.queueSlots.countDocuments({ queue }),
    ])
    const next = decide(state, { players, ready, slots })
    if (next === null) {
      return
    }

    await enterState(queue, next, emit)
  }
}

// a command's slot updates go out as one event per queue, each slot in its latest version
function flush(pending: PendingEvent[]) {
  const slots = new Map<string, Map<string, QueueSlotModel>>()
  for (const [event, params] of pending) {
    if (event === 'queue/slots:updated') {
      const key = params.queue.toHexString()
      const queueSlots = slots.get(key) ?? new Map<string, QueueSlotModel>()
      params.slots.forEach(slot => queueSlots.set(slot.id, slot))
      slots.set(key, queueSlots)
    }
  }

  for (const [event, params] of pending) {
    if (event !== 'queue/slots:updated') {
      events.emit(event, params)
      continue
    }

    const key = params.queue.toHexString()
    const queueSlots = slots.get(key)
    if (queueSlots) {
      slots.delete(key)
      events.emit(event, { queue: params.queue, slots: [...queueSlots.values()] })
    }
  }
}
