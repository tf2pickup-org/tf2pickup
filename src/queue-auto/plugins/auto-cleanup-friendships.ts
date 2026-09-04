import fp from 'fastify-plugin'
import { events } from '../../events'
import { cleanupFriendships } from '../cleanup-friendships'
import { debounceLazy } from '../../utils/debounce-lazy'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const cleanup = debounceLazy(cleanupFriendships, 100)
    events.on('queue/slots:updated', ({ gamemode }) => {
      cleanup(gamemode)
    })
  },
  {
    name: 'auto cleanup friendships',
  },
)
