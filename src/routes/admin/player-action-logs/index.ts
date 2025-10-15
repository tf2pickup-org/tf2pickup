import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../database/models/player.model'
import { PlayerActionLogsPage } from '../../../admin/player-action-logs/views/html/player-action-logs.page'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      config: {
        authorize: [PlayerRole.superUser],
      },
    },
    async (request, reply) => {
      await reply.status(200).html(PlayerActionLogsPage({ user: request.user! }))
    },
  )
}
