import { isNotNil } from 'es-toolkit'
import z from 'zod'
import { routes } from '../../../../../../utils/routes'
import { games } from '../../../../../../games'
import { gameEventToPublicDto } from '../../../dto/game-event-to-public-dto'

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
      const events = game.events
        .map(gameEventToPublicDto)
        .filter(isNotNil)

      return reply
        .type('application/hal+json')
        .status(200)
        .send({
          _links: {
            self: { href: `/api/v1/games/${game.number}/events` },
            game: { href: `/api/v1/games/${game.number}` },
          },
          _embedded: { events },
        })
    },
  )
})
