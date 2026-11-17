import fp from 'fastify-plugin'
import { events } from '../../../events'
import { safe } from '../../../utils/safe'
import { kickFromPools } from '../kick-from-pools'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'player:disconnected',
      safe(async ({ steamId }) => {
        await kickFromPools(steamId)
      }),
    )
    events.on(
      'player/ban:added',
      safe(async ({ player }) => {
        await kickFromPools(player)
      }),
    )
  },
  { name: 'captain kick players' },
)
