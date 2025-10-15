import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { HallOfFamePage } from '../../hall-of-game/views/html/hall-of-fame.page'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get('/', async (request, reply) => {
    reply.status(200).html(await HallOfFamePage({ user: request.user }))
  })
}
