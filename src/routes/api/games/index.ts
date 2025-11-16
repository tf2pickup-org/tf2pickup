import { z } from 'zod'
import { routes } from '../../../utils/routes'
import { gamePreviewSchema } from '../../../api/schemas/game-preview.schema'
import { collections } from '../../../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        tags: ['games'],
        querystring: z.object({
          page: z.coerce.number().default(1),
        }),
        response: {
          200: z.object({
            games: z.array(gamePreviewSchema),
          }),
        },
      },
    },
    async (request, reply) => {
      const itemsPerPage = 10
      const { page } = request.query
      const skip = (page - 1) * itemsPerPage
      const games = (
        await collections.games
          .find({}, { limit: itemsPerPage, skip, sort: { 'events.0.at': -1 } })
          .toArray()
      ).map(game => ({
        ...game,
        launchedAt: new Date(game.events[0].at),
      }))
      reply.status(200).send({ games })
    },
  )
})
