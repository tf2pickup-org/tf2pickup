import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { staticGameServers } from '../../../static-game-servers'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().delete(
    '/game',
    {
      schema: {
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await staticGameServers.update({ id: request.params.id }, { $unset: { game: 1 } })
      await reply.status(204).send()
    },
  )
}
