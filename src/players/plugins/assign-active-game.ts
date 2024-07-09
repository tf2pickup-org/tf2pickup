import fp from 'fastify-plugin'
import { events } from '../../events'
import { update } from '../update'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:playerReplaced', async ({ game, replacee, replacement }) => {
      await update(replacement, { $set: { activeGame: game.number } })
      await update(replacee, { $unset: { activeGame: 1 } })
    })
  },
  { name: 'assign active game' },
)
