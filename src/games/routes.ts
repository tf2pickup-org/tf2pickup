import fp from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { GameListPage } from './views/html/game-list.page'
import { GamePage } from './views/html/game.page'
import type { GameNumber } from '../database/models/game.model'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.withTypeProvider<ZodTypeProvider>().get(
      '/games',
      {
        schema: {
          querystring: z.object({
            page: z.coerce.number().optional(),
          }),
        },
      },
      async (req, reply) => {
        reply.status(200).html(await GameListPage(req.user, Number(req.query.page) || 1))
      },
    )

    app.get<{
      Params: { number: string }
    }>('/games/:number', async (req, reply) => {
      const { number } = req.params
      reply.status(200).html(await GamePage(Number(number) as GameNumber, req.user))
    })
  },
  {
    name: 'games routes',
  },
)
