import fp from 'fastify-plugin'
import { events } from '../../events'
import { tasks } from '../../tasks'
import { collections } from '../../database/collections'
import { shouldSyncEtf2lProfile } from '../should-sync-etf2l-profile'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:created', async ({ game }) => {
      const playerIds = Array.from(new Set(game.slots.map(slot => slot.player)))

      const playerDocs = await collections.players.find({ steamId: { $in: playerIds } }).toArray()

      for (const player of playerDocs) {
        if (shouldSyncEtf2lProfile(player)) {
          await tasks.schedule('etf2l:syncPlayerProfile', 0, { player: player.steamId })
        }
      }
    })
  },
  {
    name: 'etf2l - auto sync on game created',
  },
)
