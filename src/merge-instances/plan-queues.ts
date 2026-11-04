import { ObjectId } from 'mongodb'
import type { QueueId, QueueModel } from '../database/models/queue.model'

export interface QueuePlan {
  // incoming queue id → the primary's queue that takes its games
  idMap: Map<string, QueueId>
  // primary queues that take the incoming queue's settings and maps, and get enabled
  updates: QueueModel[]
  // incoming queues the primary has no counterpart of
  inserts: QueueModel[]
}

// Queues match by slug. An enabled incoming queue brings its settings and maps onto a disabled
// primary counterpart and enables it; an enabled primary queue keeps its own. An incoming queue in
// use (enabled, or with games) that the primary doesn't have is added after the primary's.
export function planQueues(
  primary: QueueModel[],
  incoming: QueueModel[],
  incomingQueuesWithGames: Set<string>,
): QueuePlan {
  const bySlug = new Map(primary.map(queue => [queue.slug, queue]))
  const idMap = new Map<string, QueueId>()
  const updates: QueueModel[] = []
  const inserts: QueueModel[] = []
  let position = primary.reduce((max, queue) => Math.max(max, queue.position), -1)

  for (const queue of incoming) {
    const inUse = queue.enabled || incomingQueuesWithGames.has(queue._id.toHexString())
    const counterpart = bySlug.get(queue.slug)
    if (counterpart && counterpart.gamemode !== queue.gamemode) {
      throw new Error(
        `queue ${queue.slug} is ${counterpart.gamemode} on the primary, but ${queue.gamemode} on the incoming instance`,
      )
    }

    if (counterpart) {
      idMap.set(queue._id.toHexString(), counterpart._id)
      if (queue.enabled && !counterpart.enabled) {
        updates.push({ ...queue, _id: counterpart._id, position: counterpart.position })
      }
    } else if (inUse) {
      const inserted = { ...queue, _id: new ObjectId() as QueueId, position: ++position }
      idMap.set(queue._id.toHexString(), inserted._id)
      inserts.push(inserted)
    }
  }

  return { idMap, updates, inserts }
}
