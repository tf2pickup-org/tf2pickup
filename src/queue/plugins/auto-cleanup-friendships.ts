import fp from 'fastify-plugin'
import { events } from '../../events'
import { cleanupFriendships } from '../cleanup-friendships'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('queue/slots:updated', async () => {
      await cleanupFriendships()
    })
  },
  {
    name: 'auto cleanup friendships',
  },
)
