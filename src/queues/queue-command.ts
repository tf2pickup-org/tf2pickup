import { Mutex } from 'async-mutex'
import { performance } from 'node:perf_hooks'
import type { QueueId, QueueModel } from '../database/models/queue.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { events, type Events } from '../events'
import { step as autoStep } from './auto/step'
import { step as captainStep } from './captain/step'
import { get } from './get'
import { queueMutexHoldDuration, queueMutexWaitDuration } from './metrics'

export type Emit = <K extends keyof Events>(event: K, params: Events[K]) => void
type PendingEvent = { [K in keyof Events]: [K, Events[K]] }[keyof Events]

// ponytail: one lock for every queue (ADR-0002); per-queue locks if the wait metric climbs
const mutex = new Mutex()

const steps: Record<QueueModel['launchMode'], (queue: QueueModel, emit: Emit) => Promise<boolean>> =
  {
    auto: autoStep,
    captain: captainStep,
  }

// Runs fn in the queue engine's critical section; fn must not call queueCommand() itself. Every
// queue fn touched (its slots, captain pool or state) is stepped through its launch mode's
// transitions until none applies, in the same critical section; events are collected and emitted
// once the lock is released.
export async function queueCommand<T>(
  operation: string,
  fn: (emit: Emit) => Promise<T>,
  { reevaluate = true }: { reevaluate?: boolean } = {},
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
        // a command that fails midway may have changed the queue already
        if (reevaluate) {
          for (const id of touchedQueues(pending)) {
            const queue = await get(id)
            while (await steps[queue.launchMode](queue, emit));
          }
        }
        queueMutexHoldDuration.record(performance.now() - holdStart, { operation })
      }
    })
  } finally {
    flush(pending)
  }
}

function touchedQueues(pending: PendingEvent[]): QueueId[] {
  const queues = new Map<string, QueueId>()
  for (const [event, params] of pending) {
    if (
      event === 'queue/slots:updated' ||
      event === 'queue/captainPool:updated' ||
      event === 'queue/state:updated'
    ) {
      queues.set(params.queue.toHexString(), params.queue)
    }
  }
  return [...queues.values()]
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

  const captainPools = new Set<string>()
  for (const [event, params] of pending) {
    if (event === 'queue/captainPool:updated') {
      const key = params.queue.toHexString()
      if (captainPools.has(key)) continue
      captainPools.add(key)
    }
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
