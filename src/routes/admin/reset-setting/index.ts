import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import {
  configurationSchema,
  type Configuration,
} from '../../../database/models/configuration-entry.model'
import { configuration } from '../../../configuration'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.post(
    '/',
    {
      config: { authorize: [PlayerRole.admin] },
      schema: {
        body: z.object({
          key: z.custom<keyof Configuration>(v =>
            configurationSchema.options.some(
              option => option._zod.def.shape.key._zod.def.values[0] === v,
            ),
          ),
        }),
      },
    },
    async (request, reply) => {
      await configuration.reset(request.body.key, request.user!.player.steamId)
      await reply.header('HX-Refresh', 'true').send()
    },
  )
})
