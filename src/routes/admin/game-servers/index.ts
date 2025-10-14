import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../database/models/player.model'
import { GameServersPage } from '../../../admin/game-servers/views/html/game-servers.page'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
    },
    async (request, reply) => {
      await reply.status(200).html(GameServersPage({ user: request.user! }))
    },
  )
}
