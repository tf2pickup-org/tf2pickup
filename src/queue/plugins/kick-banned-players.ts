import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { kick } from '../kick'
import { collections } from '../../database/collections'

export default fp(
  async () => {
    events.on('player/ban:added', async ({ ban }) => {
      await safe(async () => {
        const player = await collections.players.findOne({ _id: ban.player })
        if (!player) {
          throw new Error(`player ${ban.player.toString()} not found`)
        }

        await kick(player.steamId)
      })
    })
  },
  {
    name: 'kick banned players',
  },
)
