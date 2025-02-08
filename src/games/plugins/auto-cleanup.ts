import fp from 'fastify-plugin'
import { events } from '../../events'
import { delay } from 'es-toolkit/compat'
import { secondsToMilliseconds } from 'date-fns'
import { cleanup } from '../rcon/cleanup'
import { assertIsError } from '../../utils/assert-is-error'
import { logger } from '../../logger'
import { GameState, type GameModel } from '../../database/models/game.model'

async function cleanupSafe(game: GameModel) {
  try {
    await cleanup(game)
  } catch (error) {
    assertIsError(error)
    logger.error(error, `error cleaning up after game #${game.number}`)
  }
}

export default fp(
  async () => {
    events.on('game:ended', async ({ game }) => {
      if (game.state === GameState.ended) {
        delay(async () => await cleanupSafe(game), secondsToMilliseconds(30))
      } else {
        await cleanupSafe(game)
      }
    })
  },
  {
    name: 'auto cleanup game servers',
    encapsulate: true,
  },
)
