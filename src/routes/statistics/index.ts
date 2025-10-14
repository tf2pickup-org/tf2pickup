import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { StatisticsPage } from '../../statistics/views/html/statistics.page'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/', async (req, reply) => {
    reply.status(200).html(await StatisticsPage(req.user))
  })
}
