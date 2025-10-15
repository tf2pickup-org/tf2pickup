import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../database/models/player.model'
import { ScrambleMaps } from '../../../admin/scramble-maps/views/html/scramble-maps.page'
import { queue } from '../../../queue'
import { MapVoteOptions } from '../../../admin/scramble-maps/views/html/map-vote-options'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (request, reply) => {
        await reply.html(ScrambleMaps({ user: request.user! }))
      },
    )
    .put('/scramble', { config: { authorize: [PlayerRole.admin] } }, async (_request, reply) => {
      await queue.resetMapOptions()
      await reply.html(MapVoteOptions())
    })
}
