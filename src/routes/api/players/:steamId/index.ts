import { z } from 'zod'
import { routes } from '../../../../utils/routes'
import { steamId64 } from '../../../../shared/schemas/steam-id-64'
import { playerSchema } from '../../../../api/schemas/player.schema'
import { players } from '../../../../players'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '',
    {
      schema: {
        tags: ['players'],
        params: z.object({ steamId: steamId64 }),
        response: {
          200: playerSchema,
        },
      },
    },
    async (request, reply) => {
      const { steamId } = request.params
      const player = await players.bySteamId(steamId)
      reply.status(200).send(player)
    },
  )
})
