import { QueuePage } from '../queue/views/html/queue.page'
import { routes } from '../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get('/', async (req, reply) => {
    return reply.status(200).html(QueuePage({ user: req.user }))
  })
})
