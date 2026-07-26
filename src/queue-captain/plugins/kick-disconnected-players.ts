import fp from 'fastify-plugin'
import { watchMode } from '../../queue/watch-mode'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { kick } from '../kick'

export default fp(
  async () => {
    const isActive = await watchMode('captain')

    events.on(
      'player:disconnected',
      safe(async ({ steamId }) => {
        if (!isActive()) return
        await kick(steamId)
      }),
    )
  },
  { name: 'captain kick disconnected players' },
)
