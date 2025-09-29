import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { GameListPage } from '../../games/views/html/game-list.page'
import type { FastifyInstance } from 'fastify'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().optional(),
        }),
      },
    },
    async (request, reply) => {
      reply.status(200).html(
        await GameListPage({
          user: request.user,
          page: Number(request.query.page) || 1,
        }),
      )
    },
  )
}
