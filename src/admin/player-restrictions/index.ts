import fp from 'fastify-plugin'
import { PlayerRole } from '../../database/models/player.model'
import { PlayerRestrictionsPage } from './views/html/player-restrictions.page'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.get(
      '/admin/player-restrictions',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (request, reply) => {
        reply.status(200).html(await PlayerRestrictionsPage({ user: request.user! }))
      },
    )
  },
  {
    name: 'admin - player restrictions',
  },
)
