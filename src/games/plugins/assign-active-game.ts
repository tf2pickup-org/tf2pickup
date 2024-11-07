import fp from 'fastify-plugin'
import { events } from '../../events'
import { collections } from '../../database/collections'
import { players } from '../../players'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:created', async ({ game }) => {
      await Promise.all(
        game.slots.map(async ({ player }) => {
          const p = await collections.players.findOne({ _id: player })
          if (p === null) {
            throw new Error(`player not found: ${player.toString()}`)
          }
          await players.update(p.steamId, { $set: { activeGame: game.number } })
        }),
      )
    })
  },
  { name: 'assign active game' },
)
