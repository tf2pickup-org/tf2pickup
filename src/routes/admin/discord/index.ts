import { PlayerRole } from '../../../database/models/player.model'
import { DiscordPage } from '../../../admin/discord/views/html/discord.page'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
    },
    async (request, reply) => {
      reply.status(200).html(await DiscordPage({ user: request.user! }))
    },
  )
})
