import fp from 'fastify-plugin'
import { logger } from '../../logger'
import { events } from '../../events'
import { configure } from '../rcon/configure'
import {
  GameServerProvider,
  GameState,
  type GameModel,
  type GameNumber,
} from '../../database/models/game.model'
import { GameEventType } from '../../database/models/game-event.model'
import { update } from '../update'
import { minutesToMilliseconds, secondsToMilliseconds } from 'date-fns'
import { configuration } from '../../configuration'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    const configurators = new Map<GameNumber, AbortController>()

    async function configureExclusive(game: GameModel) {
      try {
        configurators.get(game.number)?.abort()
        const controller = new AbortController()
        const timeout = AbortSignal.timeout(await configureTimeout(game))
        const signal = AbortSignal.any([controller.signal, timeout])
        const configurator = configure(game, { signal })
        configurators.set(game.number, controller)
        await configurator
      } catch (error) {
        logger.error({ error }, `error configuring game #${game.number}`)
        events.emit('game:gameServerConfigureFailed', { game, error })
        try {
          await update(game.number, {
            $push: {
              events: {
                event: GameEventType.gameServerConfigureFailed,
                at: new Date(),
                error: error instanceof Error ? error.message : String(error),
              },
            },
          })
        } catch (updateError) {
          logger.error(
            { error: updateError },
            `failed to record configure failure for game #${game.number}`,
          )
        }
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

async function configureTimeout(game: GameModel) {
  const configureRconTimeout = minutesToMilliseconds(1)

  if (game.gameServer?.pendingTaskId) {
    // waiting for a new quick server to start
    return (await configuration.get('tf2_quick_server.timeout')) + configureRconTimeout
  }

  if (game.gameServer?.provider === GameServerProvider.tf2QuickServer) {
    // 90 seconds for STV timeout
    return secondsToMilliseconds(90) + configureRconTimeout
  }

  return configureRconTimeout
}
