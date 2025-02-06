import { z } from 'zod'
import { standardAdminPage } from '../standard-admin-page'
import { VoiceServerPage } from './views/html/voice-server.page'
import { VoiceServerType } from '../../shared/types/voice-server-type'
import { configuration } from '../../configuration'

export default standardAdminPage({
  path: '/admin/voice-server',
  bodySchema: z.object({
    type: z.nativeEnum(VoiceServerType),
    staticLink: z.string().url().nullable().default(null),
    mumbleUrl: z.string().nullable().default(null),
    mumblePort: z.coerce.number().gte(0).lte(65535).optional().default(64738),
    mumblePassword: z.string().nullable().default(null),
    mumbleChannelName: z.string().nullable().default(null),
  }),
  save: async ({ type, staticLink, mumbleUrl, mumblePort, mumblePassword, mumbleChannelName }) => {
    await configuration.set('games.voice_server_type', type)

    if (type === VoiceServerType.staticLink) {
      await configuration.set('games.voice_server.static_link', staticLink)
    } else if (type === VoiceServerType.mumble) {
      await Promise.all([
        configuration.set('games.voice_server.mumble.url', mumbleUrl ?? null),
        configuration.set('games.voice_server.mumble.port', mumblePort),
        configuration.set('games.voice_server.mumble.password', mumblePassword ?? null),
        configuration.set('games.voice_server.mumble.channel_name', mumbleChannelName ?? null),
      ])
    }
  },
  page: async user => await VoiceServerPage({ user }),
})
