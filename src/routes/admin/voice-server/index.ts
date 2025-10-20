import { PlayerRole } from '../../../database/models/player.model'
import { z } from 'zod'
import { VoiceServerType } from '../../../shared/types/voice-server-type'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { VoiceServerPage } from '../../../admin/voice-server/views/html/voice-server.page'
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
      async (request, reply) => {
        reply.status(200).html(await VoiceServerPage({ user: request.user! }))
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
            mumbleUrl: z.string().nullable().default(null),
            mumbleInternalUrl: z.string().nullable().default(null),
            mumblePort: z.coerce.number().gte(0).lte(65535).optional().default(64738),
            mumblePassword: z.string().nullable().default(null),
            mumbleChannelName: z.string().nullable().default(null),
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
        await configuration.set('games.voice_server_type', type)
        if (type === VoiceServerType.staticLink) {
          await configuration.set('games.voice_server.static_link', staticLink)
        } else if (type === VoiceServerType.mumble) {
          await Promise.all([
            configuration.set('games.voice_server.mumble.url', mumbleUrl ?? null),
            configuration.set('games.voice_server.mumble.internal_url', mumbleInternalUrl ?? null),
            configuration.set('games.voice_server.mumble.port', mumblePort),
            configuration.set('games.voice_server.mumble.password', mumblePassword ?? null),
            configuration.set('games.voice_server.mumble.channel_name', mumbleChannelName ?? null),
          ])
        }
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await VoiceServerPage({ user: request.user! }))
      },
    )
})
