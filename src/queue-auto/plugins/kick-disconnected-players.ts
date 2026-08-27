import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { kick } from '../kick'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'player:disconnected',
      safe(async ({ steamId }) => {
        const slot = await collections.queueSlots.findOne({ 'player.steamId': steamId })
        if (!slot) {
          return
        }
        await kick(slot.gamemode, steamId)
      }),
    )
  },
  { name: 'kick disconnected players' },
)
