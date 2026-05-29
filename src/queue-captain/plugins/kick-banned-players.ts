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
      'player/ban:added',
      safe(async ({ player }) => {
        if (!isActive) return
        await kick(player)
      }),
    )
  },
  { name: 'captain kick banned players' },
)
