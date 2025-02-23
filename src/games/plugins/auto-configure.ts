import fp from 'fastify-plugin'
import { logger } from '../../logger'
import { assertIsError } from '../../utils/assert-is-error'
import { events } from '../../events'
import { configure } from '../rcon/configure'
import { GameState, type GameNumber } from '../../database/models/game.model'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const configurators = new Map<GameNumber, AbortController>()

    events.on('game:gameServerAssigned', async ({ game }) => {
      try {
        const controller = new AbortController()
        const signal = controller.signal
        const configurator = configure(game, { signal })
        configurators.set(game.number, controller)
        await configurator
      } catch (error) {
        assertIsError(error)
        logger.error(error, `error configuring game #${game.number}`)
      } finally {
        configurators.delete(game.number)
      }
    })

    // eslint-disable-next-line @typescript-eslint/require-await
    events.on('game:ended', async ({ game }) => {
      if (game.state === GameState.interrupted) {
        configurators.get(game.number)?.abort()
      }
    })
  },
  {
    name: 'auto configure',
    encapsulate: true,
  },
)
