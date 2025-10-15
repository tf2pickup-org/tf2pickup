import z from 'zod'
import { GameListPage } from '../../games/views/html/game-list.page'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        querystring: z.object({
          page: z.coerce.number().optional(),
        }),
      },
    },
    async (request, reply) => {
      reply.status(200).html(
        await GameListPage({
          user: request.user,
          page: Number(request.query.page) || 1,
        }),
      )
    },
  )
})
