import { z } from 'zod'
import { routes } from '../../../../utils/routes'
import { gameNumber } from '../../../../games/schemas/game-number'
import { gameSchema } from '../../../../api/schemas/game.schema'
import { games } from '../../../../games'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '',
    {
      schema: {
        tags: ['games'],
        params: z.object({
          number: gameNumber,
        }),
        response: {
          200: gameSchema,
        },
      },
    },
    async (request, reply) => {
      const { number } = request.params
      const game = await games.findOne({ number })
      const launchedAt = new Date(game.events[0].at)
      reply.status(200).send({ ...game, gameServer: game.gameServer?.name, launchedAt })
    },
  )
})
