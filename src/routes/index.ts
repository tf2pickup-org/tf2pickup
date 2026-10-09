import { QueuePage } from '../queues/auto/views/html/queue.page'
import { routes } from '../utils/routes'
import disableCache from 'fastify-disablecache'
import { getDefault } from '../queues/get-default'

export default routes(async app => {
  await app.register(disableCache)
  app.get('/', async (_req, reply) => {
    return reply.html(QueuePage({ queue: await getDefault() }))
  })
})
