import { QueuePage } from '../queues/auto/views/html/queue.page'
import { routes } from '../utils/routes'
import disableCache from 'fastify-disablecache'
import { queues } from '../queues'

export default routes(async app => {
  await app.register(disableCache)
  // the default queue, without a redirect; the browser shows the queue's own URL
  app.get('/', async (request, reply) => {
    const queue = await queues.getDefault()
    if (request.headers['hx-request'] === 'true') {
      void reply.header('HX-Push-Url', queues.queuePageUrl(queue.slug))
    }
    return reply.html(QueuePage({ queue, atRoot: true }))
  })
})
