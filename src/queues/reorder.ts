import { collections } from '../database/collections'
import { errors } from '../errors'
import { events } from '../events'
import { list } from './list'

// Puts the queues in the given order; the first enabled one becomes the default.
export async function reorder(slugs: string[]) {
  const all = await list()
  if (slugs.length !== all.length || !all.every(({ slug }) => slugs.includes(slug))) {
    throw errors.badRequest('the new order must list every queue once')
  }

  await collections.queues.bulkWrite(
    slugs.map((slug, position) => ({
      updateOne: { filter: { slug }, update: { $set: { position } } },
    })),
  )
  all
    .filter((queue, i) => slugs[i] !== queue.slug)
    .forEach(queue => events.emit('queue:updated', { queue: queue._id }))
}
