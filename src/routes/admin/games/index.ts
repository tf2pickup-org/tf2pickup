import { PlayerRole } from '../../../database/models/player.model'
import { GamesPage } from '../../../admin/games/views/html/games.page'
import { z } from 'zod'
import { LogsTfUploadMethod } from '../../../shared/types/logs-tf-upload-method'
import { requestContext } from '@fastify/request-context'
import { secondsToMilliseconds } from 'date-fns'
import { routes } from '../../../utils/routes'
import { configuration } from '../../../configuration'

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
        reply.status(200).html(await GamesPage())
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
            whitelistId: z.string(),
            joinGameserverTimeout: z.coerce.number(),
            rejoinGameserverTimeout: z.coerce.number(),
            executeExtraCommands: z.string().transform(value => value.split('\n')),
            logsTfUploadMethod: z.enum(LogsTfUploadMethod),
          }),
        },
      },
      async (request, reply) => {
        const actor = request.user!.player.steamId
        await Promise.all([
          configuration.set('games.whitelist_id', request.body.whitelistId, actor),
          configuration.set(
            'games.join_gameserver_timeout',
            secondsToMilliseconds(request.body.joinGameserverTimeout),
            actor,
          ),
          configuration.set(
            'games.rejoin_gameserver_timeout',
            secondsToMilliseconds(request.body.rejoinGameserverTimeout),
            actor,
          ),
          configuration.set(
            'games.execute_extra_commands',
            request.body.executeExtraCommands,
            actor,
          ),
          configuration.set('games.logs_tf_upload_method', request.body.logsTfUploadMethod, actor),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await GamesPage())
      },
    )
})
