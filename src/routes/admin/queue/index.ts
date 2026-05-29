import { PlayerRole } from '../../../database/models/player.model'
import { QueueConfigPage } from '../../../admin/queue/views/html/queue-config.page'
import { z } from 'zod'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'
import { secondsToMilliseconds } from 'date-fns'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        reply.status(200).html(await QueueConfigPage())
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            mode: z.enum(['auto', 'captain']),
            captainMinGames: z.coerce.number().int().nonnegative(),
            captainPickTimeout: z.coerce.number().int().positive(),
          }),
        },
      },
      async (request, reply) => {
        const { mode, captainMinGames, captainPickTimeout } = request.body
        await Promise.all([
          configuration.set('queue.mode', mode),
          configuration.set('queue.captain_min_games', captainMinGames),
          configuration.set(
            'queue.captain_pick_timeout',
            secondsToMilliseconds(captainPickTimeout),
          ),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await QueueConfigPage())
      },
    )
})
