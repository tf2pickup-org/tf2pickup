import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../../database/models/player.model'
import { z } from 'zod'
import { getLogs } from '../../../../admin/player-action-logs/get-logs'
import { LogEntryList } from '../../../../admin/player-action-logs/views/html/log-entry-list'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
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
}
