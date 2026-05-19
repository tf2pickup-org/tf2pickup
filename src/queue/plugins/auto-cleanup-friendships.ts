import fp from 'fastify-plugin'
import { events } from '../../events'
import { cleanupFriendships } from '../cleanup-friendships'
import { logger } from '../../logger'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    let debounceTimer: NodeJS.Timeout | undefined
    events.on('queue/slots:updated', () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        cleanupFriendships().catch(error => logger.error(error))
      }, 100)
    })
  },
  {
    name: 'auto cleanup friendships',
  },
)
