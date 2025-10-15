import { PlayerRole } from '../../../../database/models/player.model'
import { z } from 'zod'
import { steamId64 } from '../../../../shared/schemas/steam-id-64'
import { Tf2ClassName } from '../../../../shared/types/tf2-class-name'
import { WinLossChart } from '../../../../players/views/html/win-loss-chart'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/:selection?',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params: z.object({
          steamId: steamId64,
          selection: z.enum(Tf2ClassName).or(z.literal('all')).optional().default('all'),
        }),
      },
    },
    async (request, reply) => {
      const { steamId, selection } = request.params
      reply.status(200).html(await WinLossChart({ steamId, selection }))
    },
  )
})
