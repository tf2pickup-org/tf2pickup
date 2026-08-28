import fp from 'fastify-plugin'
import { events } from '../../events'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { queue } from '../../queue-auto'
import { safe } from '../../utils/safe'
import { debounceLazy } from '../../utils/debounce-lazy'
import { launchGame } from '../launch-game'
import { assignGameServer } from '../assign-game-server'
import { configure } from '../rcon/configure'
import { getOrphanedGames } from '../get-orphaned-games'
import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'
import { enabledGamemodes } from '../../shared/enabled-gamemodes'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    const launchGameDebounced = debounceLazy(safe(launchGame), 100)

    events.on('queue/state:updated', ({ gamemode, state }) => {
      if (state === QueueState.launching) {
        launchGameDebounced(gamemode)
      }
    })

    app.addHook('onListen', async () => {
      for (const gamemode of enabledGamemodes) {
        if ((await queue.getState(gamemode)) === QueueState.launching) {
          launchGameDebounced(gamemode)
        }
      }

      const orphanedGames = await getOrphanedGames()
      for (const game of orphanedGames) {
        try {
          await assignGameServer(game.number, { retries: 3 })
          void configure(game.number)
        } catch (error) {
          logger.error(
            { error, gameNumber: game.number },
            'failed to assign server to orphaned game',
          )
        }
      }

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
        void configure(game.number)
      }
    })
  },
  {
    name: 'launch new game',
    encapsulate: true,
  },
)
