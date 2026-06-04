import { PlayerRole } from '../../../database/models/player.model'
import { z } from 'zod'
import { requestContext } from '@fastify/request-context'
import { activityLog } from '../../../activity-log'
import { MiscellaneousPage } from '../../../admin/miscellaneous/views/html/miscellaneous.page'
import { routes } from '../../../utils/routes'

const emptyString = z
  .union([z.literal('').transform(() => null), z.string()])
  .nullable()
  .default(null)

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        await reply.status(200).html(MiscellaneousPage())
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            discordInviteLink: emptyString,
          }),
        },
      },
      async (request, reply) => {
        const { discordInviteLink } = request.body
        await activityLog.recordConfigurationChange(
          'misc.discord_invite_link',
          discordInviteLink,
          request.user!.player.steamId,
        )
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(MiscellaneousPage())
      },
    )
})
