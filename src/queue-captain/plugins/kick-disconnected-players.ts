import fp from 'fastify-plugin'
import { configuration } from '../../configuration'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { kick } from '../kick'

export default fp(
  async () => {
    let isActive = (await configuration.get('queue.mode')) === 'captain'

    events.on('queue/mode:changed', ({ mode }) => {
      isActive = mode === 'captain'
    })

    events.on(
      'player:disconnected',
      safe(async ({ steamId }) => {
        if (!isActive) return
        await kick(steamId)
      }),
    )
  },
  { name: 'captain kick disconnected players' },
)
