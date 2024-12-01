import fp from 'fastify-plugin'
import { events } from '../../events'
import { debounce } from 'lodash-es'
import { tryConnect } from '../client'
import { safe } from '../../utils/safe'
import { secondsToMilliseconds } from 'date-fns'

export default fp(
  async () => {
    const tryConnectDebounced = debounce(tryConnect, secondsToMilliseconds(1))

    events.on(
      'configuration:updated',
      safe(async ({ key }) => {
        if (
          ![
            'games.voice_server_type',
            'games.voice_server.mumble.url',
            'games.voice_server.mumble.port',
            'games.voice_server.mumble.channel_name',
            'games.voice_server.mumble.password',
          ].includes(key)
        ) {
          return
        }

        await tryConnectDebounced()
      }),
    )

    setImmediate(safe(tryConnect))
  },
  { name: 'auto reconnect mumble client' },
)
