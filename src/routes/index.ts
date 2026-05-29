import { configuration } from '../configuration'
import { QueueCaptainPage } from '../queue-captain/views/html/queue-captain.page'
import { QueuePage } from '../queue-auto/views/html/queue.page'
import { routes } from '../utils/routes'
import disableCache from 'fastify-disablecache'

export default routes(async app => {
  await app.register(disableCache)
  app.get('/', async (_req, reply) => {
    const mode = await configuration.get('queue.mode')
    return reply.html(mode === 'captain' ? QueueCaptainPage() : QueuePage())
  })
})
