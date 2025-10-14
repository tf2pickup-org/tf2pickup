import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerRole } from '../../../database/models/player.model'
import { GamesPage } from '../../../admin/games/views/html/games.page'
import { z } from 'zod'
import { LogsTfUploadMethod } from '../../../shared/types/logs-tf-upload-method'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { secondsToMilliseconds } from 'date-fns'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (request, reply) => {
        reply.status(200).html(await GamesPage({ user: request.user! }))
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
        await Promise.all([
          configuration.set('games.whitelist_id', request.body.whitelistId),
          configuration.set(
            'games.join_gameserver_timeout',
            secondsToMilliseconds(request.body.joinGameserverTimeout),
          ),
          configuration.set(
            'games.rejoin_gameserver_timeout',
            secondsToMilliseconds(request.body.rejoinGameserverTimeout),
          ),
          configuration.set('games.execute_extra_commands', request.body.executeExtraCommands),
          configuration.set('games.logs_tf_upload_method', request.body.logsTfUploadMethod),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await GamesPage({ user: request.user! }))
      },
    )
}
