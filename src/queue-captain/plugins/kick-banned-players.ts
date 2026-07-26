import fp from 'fastify-plugin'
import { watchMode } from '../../queue/watch-mode'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { kick } from '../kick'

export default fp(
  async () => {
    const isActive = await watchMode('captain')

    events.on(
      'player/ban:added',
      safe(async ({ player }) => {
        if (!isActive()) return
        await kick(player)
      }),
    )
  },
  { name: 'captain kick banned players' },
)
