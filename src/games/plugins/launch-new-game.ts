import fp from 'fastify-plugin'
import { events } from '../../events'
import { QueueState } from '../../database/models/queue-state.model'
import { logger } from '../../logger'
import { queue } from '../../queue'
import { debounce } from 'es-toolkit'
import { safe } from '../../utils/safe'
import { launchGame } from '../launch-game'
import { assignGameServer } from '../assign-game-server'
import { configure } from '../rcon/configure'
import { getOrphanedGames } from '../get-orphaned-games'
import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'
import { QueueMode } from '../../shared/types/queue-mode'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    const launchGameDebounced = debounce(safe(launchGame), 100)

    // Captain mode also parks the queue in `launching` for the duration of the draft, but its
    // game is built from the draft result once the map is settled — not from the auto queue's
    // slots, which are empty there.
    events.on(
      'queue/state:updated',
      safe(async ({ state }) => {
        if (state === QueueState.launching && (await queue.getMode()) === QueueMode.auto) {
          launchGameDebounced()
        }
      }),
    )

    app.addHook('onListen', async () => {
      if (
        (await queue.getState()) === QueueState.launching &&
        (await queue.getMode()) === QueueMode.auto
      ) {
        launchGameDebounced()
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
