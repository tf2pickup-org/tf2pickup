import fp from 'fastify-plugin'
import { environment } from '../environment'
import { logger } from '../logger'
import { refreshStreams } from './refresh-streams'
import { safe } from '../utils/safe'
import { minutesToMilliseconds } from 'date-fns'

export default fp(
  async () => {
    if (environment.TWITCH_CLIENT_ID === undefined) {
      logger.info('TWITCH_CLIENT_ID empty; twitch.tv integration is disabled')
      return
    }

    if (environment.TWITCH_CLIENT_SECRET === undefined) {
      logger.info('TWITCH_CLIENT_SECRET empty; twitch.tv integration is disabled')
      return
    }

    setInterval(safe(refreshStreams), minutesToMilliseconds(1))
    await refreshStreams()
    logger.info('twitch.tv integration enabled')
  },
  {
    name: 'twitch-tv',
  },
)
