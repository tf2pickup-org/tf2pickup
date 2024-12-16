import fp from 'fastify-plugin'
import { events } from '../../events'
import { assign } from '../assign'
import { getOrphanedGames } from '../get-orphaned-games'
import { logger } from '../../logger'
import { safe } from '../../utils/safe'

export default fp(
  async () => {
    events.on(
      'game:created',
      safe(async ({ game }) => {
        await assign(game)
      }),
    )

    const orphanedGames = await getOrphanedGames()
    for (const game of orphanedGames) {
      try {
        await assign(game)
      } catch (error) {
        logger.error(error)
      }
    }
  },
  { name: 'auto assign game server' },
)
