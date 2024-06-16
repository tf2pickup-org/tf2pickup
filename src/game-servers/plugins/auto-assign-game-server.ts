import fp from 'fastify-plugin'
import { events } from '../../events'
import { assign } from '../assign'
import { getOrphanedGames } from '../get-orphaned-games'
import { logger } from '../../logger'

export default fp(
  async () => {
    events.on('game:created', async ({ game }) => {
      try {
        await assign(game)
      } catch (error) {
        logger.error(error)
      }
    })

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
