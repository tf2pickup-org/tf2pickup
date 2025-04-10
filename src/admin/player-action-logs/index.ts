import fp from 'fastify-plugin'
import { z } from 'zod'
import { PlayerActionLogsPage } from './views/html/player-action-logs.page'
import { getLogs } from './get-logs'
import { LogEntryList } from './views/html/log-entry-list'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../database/models/player.model'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/admin/player-action-logs',
      {
        config: {
          authorize: [PlayerRole.superUser],
        },
      },
      async (request, reply) => {
        return reply.status(200).html(PlayerActionLogsPage({ user: request.user! }))
      },
    )
    .get(
      '/admin/player-action-logs/batch',
      {
        config: {
          authorize: [PlayerRole.superUser],
        },
        schema: {
          querystring: z.object({
            before: z.string().transform(val => new Date(Number(val))),
          }),
        },
      },
      async (request, reply) => {
        const { before } = request.query
        const logs = await getLogs({ before })
        return reply.status(200).send(await LogEntryList({ logs }))
      },
    )
})
