import fp from 'fastify-plugin'
import { GamePage } from './views/html/game.page'
import type { GameNumber } from '../database/models/game.model'
import { launchNewGame } from './launch-new-game'
import { GameListPage } from './views/html/game-list.page'

export default fp(
  async app => {
    await app.register(launchNewGame)

    app.get<{
      Querystring: { page?: number }
    }>(
      '/games',
      {
        schema: {
          querystring: {
            page: { type: 'number' },
          },
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
