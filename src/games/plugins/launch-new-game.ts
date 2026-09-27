import fp from 'fastify-plugin'
import { events } from '../../events'
import { logger } from '../../logger'
import { safe } from '../../utils/safe'
import { launchGame } from '../launch-game'
import { launchFailed } from '../../queues/auto/launch-failed'
import { assignGameServer } from '../assign-game-server'
import { configure } from '../rcon/configure'
import { getOrphanedGames } from '../get-orphaned-games'
import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on(
      'queue:launching',
      safe(async snapshot => {
        try {
          await launchGame(snapshot)
        } catch (error) {
          logger.error(
            { error, queue: snapshot.queue._id },
            'failed to launch game; reverting queue',
          )
          await launchFailed(snapshot.queue._id)
        }
      }),
    )

    app.addHook('onListen', async () => {
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
