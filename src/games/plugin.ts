import fp from 'fastify-plugin'
import { GamePage } from './views/html/game.page'
import type { GameNumber } from '../database/models/game.model'

import './launch-new-game'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
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
