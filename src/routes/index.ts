import { QueuePage } from '../queue-auto/views/html/queue.page'
import { CaptainsQueuePage } from '../queue-captains/views/html/captains-queue.page'
import { queue } from '../queue'
import { QueueMode } from '../shared/types/queue-mode'
import { routes } from '../utils/routes'
import disableCache from 'fastify-disablecache'

export default routes(async app => {
  await app.register(disableCache)
  app.get('/', async (_req, reply) => {
    const mode = await queue.getMode()
    return reply.html(mode === QueueMode.captains ? CaptainsQueuePage() : QueuePage())
  })
})
