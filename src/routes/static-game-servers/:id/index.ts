import { z } from 'zod'
import { staticGameServers } from '../../../static-game-servers'
import { routes } from '../../../utils/routes'
import { PlayerRole } from '../../../database/models/player.model'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.delete(
    '/game',
    {
      schema: {
        config: {
          authorize: [PlayerRole.admin],
        },
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      await staticGameServers.update({ id: request.params.id }, { $unset: { game: 1 } })
      await reply.status(204).send()
    },
  )
})
