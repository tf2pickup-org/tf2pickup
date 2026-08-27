import fp from 'fastify-plugin'
import { events } from '../../events'
import { cleanupFriendships } from '../cleanup-friendships'
import { debounce } from 'es-toolkit'
import type { Gamemode } from '../../shared/types/gamemode'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const debounced = new Map<Gamemode, () => void>()

    events.on('queue/slots:updated', ({ gamemode }) => {
      let fn = debounced.get(gamemode)
      if (!fn) {
        fn = debounce(() => cleanupFriendships(gamemode), 100)
        debounced.set(gamemode, fn)
      }
      fn()
    })
  },
  {
    name: 'auto cleanup friendships',
  },
)
