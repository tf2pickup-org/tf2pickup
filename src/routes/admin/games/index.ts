import { PlayerRole } from '../../../database/models/player.model'
import { GamesPage } from '../../../admin/games/views/html/games.page'
import { z } from 'zod'
import { LogsTfUploadMethod } from '../../../shared/types/logs-tf-upload-method'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'
import { configuration } from '../../../configuration'
import { durationUnit } from '../../../admin/games/duration-unit'

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
        await reply.status(200).html(GamesPage())
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
            whitelistId: z
              .string()
              .trim()
              .transform(value => value || null),
            joinGameserverTimeout: z.coerce.number().min(0),
            joinGameserverTimeoutUnit: z.enum(durationUnit.all),
            rejoinGameserverTimeout: z.coerce.number().min(0),
            rejoinGameserverTimeoutUnit: z.enum(durationUnit.all),
            executeExtraCommands: z
              .string()
              .transform(value => value.split('\n').filter(line => line.trim() !== '')),
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
            durationUnit.toMs(
              request.body.joinGameserverTimeout,
              request.body.joinGameserverTimeoutUnit,
            ),
            actor,
          ),
          configuration.set(
            'games.rejoin_gameserver_timeout',
            durationUnit.toMs(
              request.body.rejoinGameserverTimeout,
              request.body.rejoinGameserverTimeoutUnit,
            ),
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
        await reply.status(200).html(GamesPage())
      },
    )
})
