import { PlayerRole } from '../../../database/models/player.model'
import { z } from 'zod'
import { VoiceServerType } from '../../../shared/types/voice-server-type'
import { requestContext } from '@fastify/request-context'
import { VoiceServerPage } from '../../../admin/voice-server/views/html/voice-server.page'
import { routes } from '../../../utils/routes'
import { activityLog } from '../../../activity-log'

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
        reply.status(200).html(await VoiceServerPage())
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
            type: z.enum(VoiceServerType),
            staticLink: z.url().nullable().default(null),
            mumbleUrl: emptyString,
            mumbleInternalUrl: emptyString,
            mumblePort: z.coerce.number().gte(0).lte(65535).optional().default(64738),
            mumblePassword: emptyString,
            mumbleChannelName: emptyString,
          }),
        },
      },
      async (request, reply) => {
        const {
          type,
          staticLink,
          mumbleUrl,
          mumbleInternalUrl,
          mumblePort,
          mumblePassword,
          mumbleChannelName,
        } = request.body
        const actor = request.user!.player.steamId
        await activityLog.recordConfigurationChange('games.voice_server_type', type, actor)
        if (type === VoiceServerType.staticLink) {
          await activityLog.recordConfigurationChange(
            'games.voice_server.static_link',
            staticLink,
            actor,
          )
        } else if (type === VoiceServerType.mumble) {
          await Promise.all([
            activityLog.recordConfigurationChange(
              'games.voice_server.mumble.url',
              mumbleUrl,
              actor,
            ),
            activityLog.recordConfigurationChange(
              'games.voice_server.mumble.internal_url',
              mumbleInternalUrl,
              actor,
            ),
            activityLog.recordConfigurationChange(
              'games.voice_server.mumble.port',
              mumblePort,
              actor,
            ),
            activityLog.recordConfigurationChange(
              'games.voice_server.mumble.password',
              mumblePassword,
              actor,
            ),
            activityLog.recordConfigurationChange(
              'games.voice_server.mumble.channel_name',
              mumbleChannelName,
              actor,
            ),
          ])
        }
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await VoiceServerPage())
      },
    )
})
