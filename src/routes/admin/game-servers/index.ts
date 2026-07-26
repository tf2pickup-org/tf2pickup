import { PlayerRole } from '../../../database/models/player.model'
import { GameServersPage } from '../../../admin/game-servers/views/html/game-servers.page'
import { HideServerInfoSelect } from '../../../admin/game-servers/views/html/hide-server-info-setting'
import { configuration } from '../../../configuration'
import { HideServerInfoMode } from '../../../shared/types/hide-server-info-mode'
import { routes } from '../../../utils/routes'
import { z } from 'zod'

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
        await reply.status(200).html(GameServersPage())
      },
    )
    .put(
      '/hide-server-info',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            hideServerInfoMode: z.enum(HideServerInfoMode),
          }),
        },
      },
      async (request, reply) => {
        await configuration.set(
          'games.hide_server_info_from_spectators',
          request.body.hideServerInfoMode,
          request.user!.player.steamId,
        )
        return reply.status(200).html(HideServerInfoSelect({ saveResult: { success: true } }))
      },
    )
})
