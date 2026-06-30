import fp from 'fastify-plugin'
import { events } from '../../events'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { queue } from '../../queue-auto'
import { debounce } from 'es-toolkit'
import { safe } from '../../utils/safe'
import { launchGame } from '../launch-game'
import { assignGameServer } from '../assign-game-server'
import { configure } from '../rcon/configure'
import { getOrphanedGames } from '../get-orphaned-games'
import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'
import type { Gamemode } from '../../shared/types/gamemode'
import { enabledGamemodes } from '../../shared/enabled-gamemodes'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    const launchGameDebounced = new Map<Gamemode, () => void>()
    function launchGameFor(gamemode: Gamemode) {
      let fn = launchGameDebounced.get(gamemode)
      if (!fn) {
        fn = debounce(
          safe(() => launchGame(gamemode)),
          100,
        )
        launchGameDebounced.set(gamemode, fn)
      }
      fn()
    }

    events.on('queue/state:updated', ({ gamemode, state }) => {
      if (state === QueueState.launching) {
        launchGameFor(gamemode)
      }
    })

    app.addHook('onListen', async () => {
      for (const gamemode of enabledGamemodes) {
        if ((await queue.getState(gamemode)) === QueueState.launching) {
          launchGameFor(gamemode)
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
