import fp from 'fastify-plugin'
import { retry } from 'es-toolkit'
import { events } from '../../events'
import { assignGameServer } from '../assign-game-server'
import { getOrphanedGames } from '../get-orphaned-games'
import { logger } from '../../logger'
import { games } from '../../games'
import { GameEventType } from '../../database/models/game-event.model'
import { notifyGameServerAssignmentFailed } from '../../discord/notify-game-server-assignment-failed'
import { secondsToMilliseconds } from 'date-fns'
import { collections } from '../../database/collections'
import { GameState } from '../../database/models/game.model'

export default fp(
  async () => {
    events.on('game:created', async ({ game }) => {
      try {
        await retry(() => assignGameServer(game), { retries: 3, delay: secondsToMilliseconds(1) })
      } catch (error) {
        logger.error({ game, error }, 'failed to assign game server after 3 attempts')

        const errorMessage = error instanceof Error ? error.message : String(error)
        const reason = errorMessage.includes('no free servers available')
          ? 'no game servers available'
          : 'cannot assign game server'

        try {
          await games.update(game.number, {
            $push: {
              events: {
                event: GameEventType.gameServerAssignmentFailed,
                at: new Date(),
                reason,
              },
            },
          })

          await notifyGameServerAssignmentFailed(game.number, reason)
        } catch (innerError) {
          logger.error(
            { game, error, innerError },
            'failed to handle game server assignment failure',
          )
        }
      }
    })

    const orphanedGames = await getOrphanedGames()
    for (const game of orphanedGames) {
      try {
        await retry(() => assignGameServer(game), { retries: 3, delay: secondsToMilliseconds(1) })
      } catch (error) {
        logger.error(
          { game, error },
          'failed to assign game server to orphaned game after 3 attempts',
        )

        const errorMessage = error instanceof Error ? error.message : String(error)
        const reason = errorMessage.includes('no free servers available')
          ? 'no game servers available'
          : 'cannot assign game server'

        try {
          await games.update(game.number, {
            $push: {
              events: {
                event: GameEventType.gameServerAssignmentFailed,
                at: new Date(),
                reason,
              },
            },
          })

          await notifyGameServerAssignmentFailed(game.number, reason)
        } catch (innerError) {
          logger.error(
            { game, error, innerError },
            'failed to handle game server assignment failure for orphaned game',
          )
        }
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
      events.emit('game:gameServerAssigned', { game })
    }
  },
  { name: 'auto assign game server' },
)
