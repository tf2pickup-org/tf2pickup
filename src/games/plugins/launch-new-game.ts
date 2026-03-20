import fp from 'fastify-plugin'
import { events } from '../../events'
import { QueueState } from '../../database/models/queue-state.model'
import { queue } from '../../queue'
import { debounce } from 'es-toolkit'
import { safe } from '../../utils/safe'
import { launchGame } from '../launch-game'
import { assignGameServerWithRetry } from '../assign-game-server-with-retry'
import { GameState } from '../../database/models/game.model'
import { cancelConfigure } from '../rcon/configure'
import { collections } from '../../database/collections'
import { logger } from '../../logger'
import { tasks } from '../../tasks'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    const launchGameDebounced = debounce(safe(launchGame), 100)

    events.on('queue/state:updated', ({ state }) => {
      if (state === QueueState.launching) {
        launchGameDebounced()
      }
    })

    app.addHook('onListen', async () => {
      if ((await queue.getState()) === QueueState.launching) {
        launchGameDebounced()
      }

      // Recover games created but never assigned a server (crash before assign)
      const orphanedGames = await collections.games
        .find({ state: GameState.created, gameServer: { $exists: false } })
        .toArray()
      for (const game of orphanedGames) {
        logger.warn({ gameNumber: game.number }, 'recovering orphaned game — assigning server')
        try {
          await assignGameServerWithRetry(game.number)
          await tasks.schedule('games:configureServer', 0, { gameNumber: game.number })
        } catch (error) {
          logger.error(
            { error, gameNumber: game.number },
            'failed to assign server to orphaned game',
          )
        }
      }

      // Resume configure for games with a pending tf2QuickServer task (crash while waiting)
      const pendingGames = await collections.games
        .find({
          state: { $in: [GameState.created, GameState.configuring] },
          'gameServer.pendingTaskId': { $exists: true },
        })
        .toArray()
      for (const game of pendingGames) {
        logger.info(
          { gameNumber: game.number, pendingTaskId: game.gameServer?.pendingTaskId },
          'resuming configure for game with pending tf2QuickServer task',
        )
        await tasks.schedule('games:configureServer', 0, { gameNumber: game.number })
      }
    })

    events.on('game:ended', ({ game }) => {
      if (game.state === GameState.interrupted) {
        cancelConfigure(game.number)
      }
    })
  },
)
