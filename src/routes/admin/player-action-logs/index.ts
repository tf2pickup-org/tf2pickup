import { PlayerRole } from '../../../database/models/player.model'
import { PlayerActionLogsPage } from '../../../admin/player-action-logs/views/html/player-action-logs.page'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authorize: [PlayerRole.superUser],
      },
    },
    async (request, reply) => {
      await reply.status(200).html(PlayerActionLogsPage({ user: request.user! }))
    },
  )
})
