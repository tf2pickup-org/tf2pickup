import { z } from 'zod'
import { routes } from '../../../utils/routes'
import { playerSchema } from '../../../api/schemas/player.schema'
import { collections } from '../../../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        tags: ['players'],
        response: {
          200: z.array(playerSchema),
        },
      },
    },
    async (_, reply) => {
      const players = await collections.players.find().toArray()
      reply.status(200).send(players)
    },
  )
})
