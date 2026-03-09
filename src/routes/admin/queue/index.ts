import { PlayerRole } from '../../../database/models/player.model'
import { z } from 'zod'
import { secondsToMilliseconds } from 'date-fns'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { MapVoteTiming } from '../../../shared/types/map-vote-timing'
import { QueuePage } from '../../../admin/queue/views/html/queue.page'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get('/', { config: { authorize: [PlayerRole.admin] } }, async (_request, reply) => {
      reply.html(await QueuePage())
    })
    .post(
      '/',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          body: z.object({
            mapVoteTiming: z.enum(MapVoteTiming),
            mapVoteTimeout: z.coerce.number().min(5).max(60),
          }),
        },
      },
      async (request, reply) => {
        const { mapVoteTiming, mapVoteTimeout } = request.body
        await configuration.set('queue.map_vote_timing', mapVoteTiming)
        await configuration.set('queue.map_vote_timeout', secondsToMilliseconds(mapVoteTimeout))
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.html(await QueuePage())
      },
    )
})
