import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { events, type Events } from '../../events'
import { getState } from '../get-state'
import { withQueueLock } from '../with-queue-lock'
import { decide } from './decide'
import { enterState } from './enter-state'

export type Emit = <K extends keyof Events>(event: K, params: Events[K]) => void
type PendingEvent = { [K in keyof Events]: [K, Events[K]] }[keyof Events]

// Runs fn in the queue's critical section. Any slot change re-evaluates the queue state in the same
// critical section; events are collected and emitted once the lock is released.
export async function queueCommand<T>(
  queue: QueueId,
  operation: string,
  fn: (emit: Emit) => Promise<T>,
): Promise<T> {
  const pending: PendingEvent[] = []
  const emit: Emit = (event, params) => {
    pending.push([event, params] as PendingEvent)
  }

  try {
    return await withQueueLock(queue, operation, async () => {
      try {
        return await fn(emit)
      } finally {
        // a command that fails midway may have changed slots already
        if (pending.some(([event]) => event === 'queue/slots:updated')) {
          await advance(queue, emit)
        }
      }
    })
  } finally {
    flush(pending)
  }
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

// a command's slot updates go out as one event, each slot in its latest version
function flush(pending: PendingEvent[]) {
  const slots = new Map<string, QueueSlotModel>()
  for (const [event, params] of pending) {
    if (event === 'queue/slots:updated') {
      params.slots.forEach(slot => slots.set(slot.id, slot))
    }
  }

  let slotsEmitted = false
  for (const [event, params] of pending) {
    if (event !== 'queue/slots:updated') {
      events.emit(event, params)
    } else if (!slotsEmitted) {
      slotsEmitted = true
      events.emit(event, { queue: params.queue, slots: [...slots.values()] })
    }
  }
}
