import fp from 'fastify-plugin'
import { events } from '../../events'
import { whenGameEnds } from '../when-game-ends'
import { delay } from 'lodash-es'
import { secondsToMilliseconds } from 'date-fns'
import { cleanup } from '../cleanup'
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
    events.on('game:updated', async d =>
      whenGameEnds(d, async ({ after }) => {
        if (after.state === GameState.ended) {
          delay(async () => await cleanupSafe(after), secondsToMilliseconds(30))
        } else {
          await cleanupSafe(after)
        }
      }),
    )
  },
  {
    name: 'auto cleanup game servers',
    encapsulate: true,
  },
)
