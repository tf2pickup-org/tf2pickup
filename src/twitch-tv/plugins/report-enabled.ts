import fp from 'fastify-plugin'
import { environment } from '../../environment'
import { logger } from '../../logger'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  if (!environment.TWITCH_CLIENT_ID) {
    logger.info('TWITCH_CLIENT_ID empty; twitch.tv integration is disabled')
    return
  }

  if (!environment.TWITCH_CLIENT_SECRET) {
    logger.info('TWITCH_CLIENT_SECRET empty; twitch.tv integration is disabled')
    return
  }

  logger.info('twitch.tv integration enabled')
})
