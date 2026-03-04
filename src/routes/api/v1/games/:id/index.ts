import z from 'zod'
import { routes } from '../../../../../utils/routes'
import { games } from '../../../../../games'
import { gameToDto } from '../../dto/game-to-dto'

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
      const game = await games.findOne({ number: request.params.id })
      return reply.type('application/hal+json').status(200).send(gameToDto(game))
    },
  )
})
