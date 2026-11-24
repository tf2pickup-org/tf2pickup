import { PlayerRole } from '../../../database/models/player.model'
import { RegistrationPage } from '../../../admin/registration/views/html/registration.page'
import { z } from 'zod'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get('/', { config: { authorize: [PlayerRole.admin] } }, async (_request, reply) => {
      await reply.status(200).html(RegistrationPage())
    })
    .post(
      '/',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          body: z.object({
            etf2lAccountRequired: z.coerce.boolean().default(false),
            etf2lBanSync: z.coerce.boolean().default(false),
            etf2lBanSyncReasons: z.string().transform(value =>
              value
                .split('\n')
                .map(reason => reason.trim())
                .filter(Boolean),
            ),
            minimumInGameHours: z.coerce.number().min(0),
          }),
        },
      },
      async (request, reply) => {
        const { etf2lAccountRequired, etf2lBanSync, etf2lBanSyncReasons, minimumInGameHours } =
          request.body
        const actor = request.user!.player.steamId
        await Promise.all([
          configuration.set('players.etf2l_account_required', etf2lAccountRequired, actor),
          configuration.set('players.etf2l_ban_sync', etf2lBanSync, actor),
          configuration.set('players.etf2l_ban_sync_reasons', etf2lBanSyncReasons, actor),
          configuration.set('players.minimum_in_game_hours', minimumInGameHours, actor),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(RegistrationPage())
      },
    )
})
