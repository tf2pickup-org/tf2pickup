import fp from 'fastify-plugin'
import { events } from '../../events'
import { configure } from '../rcon/configure'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:gameServerReinitializationRequested', async ({ game }) => {
      await configure(game.number)
    })
  },
)
