import fp from 'fastify-plugin'
import { logger } from '../../logger'
import { assertIsError } from '../../utils/assert-is-error'
import { events } from '../../events'
import { configure } from '../rcon/configure'
import { GameState, type GameModel, type GameNumber } from '../../database/models/game.model'
import { minutesToMilliseconds } from 'date-fns'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const configurators = new Map<GameNumber, AbortController>()

    async function configureExclusive(game: GameModel) {
      try {
        configurators.get(game.number)?.abort()
        const controller = new AbortController()
        const timeout = AbortSignal.timeout(minutesToMilliseconds(1))
        const signal = AbortSignal.any([controller.signal, timeout])
        const configurator = configure(game, { signal })
        configurators.set(game.number, controller)
        await configurator
      } catch (error) {
        assertIsError(error)
        logger.error(error, `error configuring game #${game.number}`)
      } finally {
        configurators.delete(game.number)
      }
    }

    events.on('game:gameServerAssigned', async ({ game }) => {
      await configureExclusive(game)
    })

    events.on('game:gameServerReinitializationRequested', async ({ game }) => {
      await configureExclusive(game)
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
