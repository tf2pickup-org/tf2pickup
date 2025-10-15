import { PlayerRole } from '../../../../database/models/player.model'
import { z } from 'zod'
import { RegionList } from '../../../../admin/game-servers/views/html/serveme-tf-preferred-region'
import { configuration } from '../../../../configuration'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.put(
    '/preferred-region',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        body: z.object({
          servemeTfPreferredRegion: z.string().transform(val => (val === 'none' ? null : val)),
        }),
      },
    },
    async (request, reply) => {
      await configuration.set('serveme_tf.preferred_region', request.body.servemeTfPreferredRegion)
      return reply.status(200).html(RegionList({ saveResult: { success: true } }))
    },
  )
})
