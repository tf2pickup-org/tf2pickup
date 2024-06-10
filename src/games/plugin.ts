import fp from 'fastify-plugin'
import { GamePage } from './views/html/game.page'
import type { GameNumber } from '../database/models/game.model'
import launchNewGame from './launch-new-game'
import { GameListPage } from './views/html/game-list.page'
import { events } from '../events'
import { GameSummary } from './views/html/game-summary'
import configure from './configure'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

export default fp(
  async app => {
    await app.register(launchNewGame)
    await app.register(configure)

    events.on('game:updated', ({ after }) => {
      app.gateway.broadcast(async actor => await GameSummary({ game: after, actor }))
    })

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
    name: 'games',
  },
)
