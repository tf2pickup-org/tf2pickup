import { sampleSize } from 'es-toolkit'
import { collections } from '../../database/collections'
import type { QueueId } from '../../database/models/queue.model'
import { get } from '../get'
import type { Emit } from '../queue-command'

// must run inside queueCommand()
export async function resetMapOptions(queue: QueueId, emit: Emit) {
  const { maps } = await get(queue)
  const eligible = maps.filter(({ cooldown }) => !cooldown)
  const choices = sampleSize(eligible, Math.min(3, eligible.length)).map(({ name }) => name)

  await collections.queueMapOptions.deleteMany({ queue })
  if (choices.length > 0) {
    await collections.queueMapOptions.insertMany(choices.map(name => ({ queue, name })))
  }
  await collections.queueMapVotes.deleteMany({ queue })
  emit('queue/mapOptions:reset', { queue, mapOptions: choices })
}
