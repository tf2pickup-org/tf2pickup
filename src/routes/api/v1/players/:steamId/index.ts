import z from 'zod'
import { routes } from '../../../../../utils/routes'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { collections } from '../../../../../database/collections'
import { errors } from '../../../../../errors'
import { playerToDto } from '../../../../../players/views/json/player-to-dto'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({ steamId: steamId64 }),
      },
    },
    async (request, reply) => {
      const player = await collections.players.findOne({ steamId: request.params.steamId })
      if (!player) {
        throw errors.notFound('Player not found')
      }
      return reply.type('application/hal+json').status(200).send(playerToDto(player))
    },
  )
})
