import { QueuePage } from '../queue/views/html/queue.page'
import { routes } from '../utils/routes'
import disableCache from 'fastify-disablecache'

export default routes(async app => {
  await app.register(disableCache)
  app.get('/', async (req, reply) => {
    return reply.status(200).html(QueuePage({ user: req.user }))
  })
})
