import { PlayerRole } from '../../../database/models/player.model'
import { z } from 'zod'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
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
        reply.status(200).html(await MiscellaneousPage())
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
        await configuration.set('misc.discord_invite_link', discordInviteLink)
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await MiscellaneousPage())
      },
    )
})
