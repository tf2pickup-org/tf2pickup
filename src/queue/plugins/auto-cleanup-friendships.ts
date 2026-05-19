import fp from 'fastify-plugin'
import { events } from '../../events'
import { cleanupFriendships } from '../cleanup-friendships'
import { debounce } from 'es-toolkit'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('queue/slots:updated', debounce(cleanupFriendships, 100))
  },
  {
    name: 'auto cleanup friendships',
  },
)
