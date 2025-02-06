import fp from 'fastify-plugin'
import { PlayerRole } from '../../database/models/player.model'
import { ScrambleMaps } from './views/html/scramble-maps.page'
import { queue } from '../../queue'
import { MapVoteOptions } from './views/html/map-vote-options'

export default fp(async app => {
  app
    .get(
      '/admin/scramble-maps',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (request, reply) => {
        reply.html(await ScrambleMaps({ user: request.user! }))
      },
    )
    .put(
      '/admin/scramble-maps/scramble',
      { config: { authorize: [PlayerRole.admin] } },
      async (_request, reply) => {
        await queue.resetMapOptions()
        reply.html(await MapVoteOptions())
      },
    )
})
