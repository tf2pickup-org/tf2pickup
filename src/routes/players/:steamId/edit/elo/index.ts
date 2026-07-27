import z from 'zod'
import { PlayerRole } from '../../../../../database/models/player.model'
import { QueueMode } from '../../../../../shared/types/queue-mode'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { EditPlayerEloPage } from '../../../../../players/views/html/edit-player.page'
import { recordEloPageRender } from '../../../../../telemetry/record-elo-page-render'
import { routes } from '../../../../../utils/routes'
import { safe } from '../../../../../utils/safe'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params: z.object({
          steamId: steamId64,
        }),
        querystring: z.object({
          mode: z.enum(QueueMode).default(QueueMode.auto),
        }),
      },
    },
    async (req, reply) => {
      const { steamId } = req.params
      const { mode } = req.query
      safe(recordEloPageRender)()
      await reply.status(200).html(EditPlayerEloPage({ steamId, mode }))
    },
  )
})
