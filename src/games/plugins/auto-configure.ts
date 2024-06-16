import fp from 'fastify-plugin'
import { logger } from '../../logger'
import { assertIsError } from '../../utils/assert-is-error'
import { events } from '../../events'
import { configure } from '../configure'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:gameServerAssigned', async ({ game }) => {
      try {
        await configure(game)
      } catch (error) {
        assertIsError(error)
        logger.error(error, `error configuring game #${game.number}`)
      }
    })
  },
  {
    name: 'auto configure',
    encapsulate: true,
  },
)
