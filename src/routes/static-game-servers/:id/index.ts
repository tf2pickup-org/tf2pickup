import { z } from 'zod'
import { staticGameServers } from '../../../static-game-servers'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.delete(
    '/game',
    {
      schema: {
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
