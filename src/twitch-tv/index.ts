import fp from 'fastify-plugin'
import { environment } from '../environment'
import { logger } from '../logger'
import { refreshStreams } from './refresh-streams'
import { safe } from '../utils/safe'
import { minutesToMilliseconds } from 'date-fns'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    if (environment.TWITCH_CLIENT_ID === undefined) {
      logger.info('TWITCH_CLIENT_ID empty; twitch.tv integration is disabled')
      return
    }

    if (environment.TWITCH_CLIENT_SECRET === undefined) {
      logger.info('TWITCH_CLIENT_SECRET empty; twitch.tv integration is disabled')
      return
    }

    app.addHook('onReady', async () => {
      setInterval(safe(refreshStreams), minutesToMilliseconds(1))
      await refreshStreams()
    })

    await app.register((await import('./routes')).default)
    logger.info('twitch.tv integration enabled')
  },
  {
    name: 'twitch-tv',
  },
)
