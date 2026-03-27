import z from 'zod'
import { routes } from '../../../../../utils/routes'
import { games } from '../../../../../games'
import { gameToDto } from '../../../../../games/views/json/game-to-dto'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ id: games.schemas.gameNumber }),
      },
    },
    async (request, reply) => {
      const game = await games.findOne({ number: request.params.id }, [
        'number',
        'map',
        'state',
        'score',
        'logsUrl',
        'demoUrl',
        'events',
        'gameServer.name',
        'gameServer.provider',
      ])
      return reply.type('application/hal+json').status(200).send(gameToDto(game))
    },
  )
})
