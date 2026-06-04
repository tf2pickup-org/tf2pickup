import { PlayerRole } from '../../../database/models/player.model'
import { GamesPage } from '../../../admin/games/views/html/games.page'
import { z } from 'zod'
import { LogsTfUploadMethod } from '../../../shared/types/logs-tf-upload-method'
import { requestContext } from '@fastify/request-context'
import { activityLog } from '../../../activity-log'
import { secondsToMilliseconds } from 'date-fns'
import { routes } from '../../../utils/routes'

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
          activityLog.recordConfigurationChange(
            'games.whitelist_id',
            request.body.whitelistId,
            actor,
          ),
          activityLog.recordConfigurationChange(
            'games.join_gameserver_timeout',
            secondsToMilliseconds(request.body.joinGameserverTimeout),
            actor,
          ),
          activityLog.recordConfigurationChange(
            'games.rejoin_gameserver_timeout',
            secondsToMilliseconds(request.body.rejoinGameserverTimeout),
            actor,
          ),
          activityLog.recordConfigurationChange(
            'games.execute_extra_commands',
            request.body.executeExtraCommands,
            actor,
          ),
          activityLog.recordConfigurationChange(
            'games.logs_tf_upload_method',
            request.body.logsTfUploadMethod,
            actor,
          ),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await GamesPage())
      },
    )
})
