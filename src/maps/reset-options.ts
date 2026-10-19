import { sampleSize } from 'es-toolkit'
import { collections } from '../database/collections'
import type { QueueId } from '../database/models/queue.model'
import { events } from '../events'
import { get } from '../queues/get'

export async function resetMapOptions(queue: QueueId) {
  const { maps } = await get(queue)
  const eligible = maps.filter(({ cooldown }) => !cooldown)
  const choices = sampleSize(eligible, Math.min(3, eligible.length)).map(({ name }) => name)

  await collections.queueMapOptions.deleteMany({ queue })
  if (choices.length > 0) {
    await collections.queueMapOptions.insertMany(choices.map(name => ({ queue, name })))
  }
  await collections.queueMapVotes.deleteMany({ queue })
  events.emit('queue/mapOptions:reset', { queue, mapOptions: choices })
}
