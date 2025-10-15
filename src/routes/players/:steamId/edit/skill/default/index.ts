import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../../../../database/models/player.model'
import { z } from 'zod'
import { steamId64 } from '../../../../../../shared/schemas/steam-id-64'
import { AdminToolbox } from '../../../../../../players/views/html/admin-toolbox'

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
    async (_, reply) => {
      return reply.html(AdminToolbox.replaceSkillValues({ skill: {} }))
    },
  )
}
