import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { QueuePage } from '../queue/views/html/queue.page'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/', async (req, reply) => {
    return reply.status(200).html(QueuePage({ user: req.user }))
  })
}
