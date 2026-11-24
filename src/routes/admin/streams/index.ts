import { requestContext } from '@fastify/request-context'
import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { StreamsPage } from '../../../admin/streams/views/html/streams.page'
import { configuration } from '../../../configuration'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get('/', { config: { authorize: [PlayerRole.admin] } }, async (_request, reply) => {
      await reply.status(200).html(StreamsPage())
    })
    .post(
      '/',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          body: z.object({
            promotedStreams: z.string().transform(value => [
              ...new Set(
                value
                  .split('\n')
                  .map(name => name.trim().toLowerCase())
                  .filter(Boolean),
              ),
            ]),
          }),
        },
      },
      async (request, reply) => {
        await configuration.set(
          'twitchtv.promoted_streams',
          request.body.promotedStreams,
          request.user!.player.steamId,
        )
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(StreamsPage())
      },
    )
})
