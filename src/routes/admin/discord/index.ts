import { requestContext } from '@fastify/request-context'
import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { DiscordPage } from '../../../admin/discord/views/html/discord.page'
import { configuration } from '../../../configuration'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get('/', { config: { authorize: [PlayerRole.admin] } }, async (_request, reply) => {
      await reply.status(200).html(DiscordPage())
    })
    .post(
      '/',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          body: z.object({
            discordInviteLink: z
              .union([z.literal('').transform(() => null), z.url()])
              .default(null),
          }),
        },
      },
      async (request, reply) => {
        await configuration.set(
          'misc.discord_invite_link',
          request.body.discordInviteLink,
          request.user!.player.steamId,
        )
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(DiscordPage())
      },
    )
})
