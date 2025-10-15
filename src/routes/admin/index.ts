import { PlayerRole } from '../../database/models/player.model'
import { routes } from '../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
    },
    async (_request, reply) => {
      await reply.redirect('/admin/player-restrictions')
    },
  )
})
