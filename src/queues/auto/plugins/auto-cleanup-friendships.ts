import fp from 'fastify-plugin'
import { events } from '../../../events'
import { cleanupFriendships } from '../cleanup-friendships'
import { debounce } from 'es-toolkit'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const cleanups = new Map<string, () => void>()
    events.on('queue/slots:updated', ({ queue }) => {
      const key = queue.toHexString()
      let cleanup = cleanups.get(key)
      if (!cleanup) {
        cleanup = debounce(async () => {
          await cleanupFriendships(queue)
        }, 100)
        cleanups.set(key, cleanup)
      }
      cleanup()
    })
  },
  {
    name: 'auto cleanup friendships',
  },
)
