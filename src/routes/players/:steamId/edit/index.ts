import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import z from 'zod'
import { PlayerRole } from '../../../../database/models/player.model'
import { steamId64 } from '../../../../shared/schemas/steam-id-64'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params: z.object({
          steamId: steamId64,
        }),
      },
    },
    async (req, reply) => {
      const { steamId } = req.params
      await reply.redirect(`/players/${steamId}/edit/profile`)
    },
  )
}
