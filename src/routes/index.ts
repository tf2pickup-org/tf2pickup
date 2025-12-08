import { QueuePage } from '../queue/views/html/queue.page'
import { routes } from '../utils/routes'
import disableCache from 'fastify-disablecache'

export default routes(async app => {
  await app.register(disableCache)
  app.get('/', async (_req, reply) => {
    return reply.html(QueuePage())
  })
})
