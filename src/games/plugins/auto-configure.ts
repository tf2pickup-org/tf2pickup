import fp from 'fastify-plugin'
import { logger } from '../../logger'
import { assertIsError } from '../../utils/assert-is-error'
import { events } from '../../events'
import { configure } from '../configure'
import type { GameNumber } from '../../database/models/game.model'
import { whenForceEnded } from '../when-force-ended'

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

    events.on('game:updated', async d =>
      whenForceEnded(d, ({ after }) => {
        configurators.get(after.number)?.abort()
      }),
    )
  },
  {
    name: 'auto configure',
    encapsulate: true,
  },
)
