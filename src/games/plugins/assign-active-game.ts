import fp from 'fastify-plugin'
import { events } from '../../events'
import { players } from '../../players'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:created',
      safe(async ({ game }) => {
        await Promise.all(
          game.slots.map(async ({ player }) => {
            await players.update(player, { $set: { activeGame: game.number } })
          }),
        )
      }),
    )
  },
  { name: 'assign active game' },
)
