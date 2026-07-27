import { requestContext } from '@fastify/request-context'
import { z } from 'zod'
import { AdminQueuePage } from '../../../admin/queue/views/html/queue.page'
import { configuration } from '../../../configuration'
import { PlayerRole } from '../../../database/models/player.model'
import { errors } from '../../../errors'
import { canChangeMode } from '../../../queue-captains/can-change-mode'
import { QueueMode } from '../../../shared/types/queue-mode'
import { routes } from '../../../utils/routes'

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
        await reply.status(200).html(AdminQueuePage())
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
            mode: z.enum(QueueMode),
            captainsMinGames: z.coerce.number().min(0),
          }),
        },
      },
      async (request, reply) => {
        const actor = request.user!.player.steamId
        const currentMode = await configuration.get('queue.mode')

        // the select is disabled client-side while players are queued; re-check it here so a
        // hand-crafted post cannot wipe a queue out from under everyone
        if (request.body.mode !== currentMode) {
          const changeable = await canChangeMode()
          if (!changeable.allowed) {
            throw errors.conflict(`cannot change the queue mode: ${changeable.reason}`)
          }

          await configuration.set('queue.mode', request.body.mode, actor)
        }

        await configuration.set('queue.captains.min_games', request.body.captainsMinGames, actor)
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(AdminQueuePage())
      },
    )
})
