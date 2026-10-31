import disableCache from 'fastify-disablecache'
import { z } from 'zod'
import { QueueContentSwap } from '../../../queues/auto/views/html/queue-content-swap'
import { QueuePage } from '../../../queues/auto/views/html/queue.page'
import { queues } from '../../../queues'
import { routes } from '../../../utils/routes'

export default routes(async app => {
  await app.register(disableCache)
  app.get('/', { schema: { params: z.object({ slug: z.string() }) } }, async (request, reply) => {
    const queue = await queues.bySlug(request.params.slug)
    if (!queue.enabled) {
      request.flash('error', `The ${queue.name} queue is not available right now`)
      return reply.redirect('/')
    }

    if (request.isPartialFor('queue-content')) {
      return reply.html(QueueContentSwap({ queue }))
    }
    return reply.html(QueuePage({ queue }))
  })
})
