import { PlayerRole } from '../../../../database/models/player.model'
import { z } from 'zod'
import { RegionSelect } from '../../../../admin/game-servers/views/html/tf2-quick-server-region'
import { configuration } from '../../../../configuration'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/region',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        return reply.status(200).html(RegionSelect())
      },
    )
    .put(
      '/region',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            tf2QuickServerRegion: z.string(),
          }),
        },
      },
      async (request, reply) => {
        await configuration.set('tf2_quick_server.region', request.body.tf2QuickServerRegion)
        return reply.status(200).html(RegionSelect({ saveResult: { success: true } }))
      },
    )
})
