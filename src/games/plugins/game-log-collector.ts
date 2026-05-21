import fp from 'fastify-plugin'
import { events } from '../../events'
import { findOne } from '../find-one'
import type { GameNumber } from '../../database/models/game.model'
import { gameLogSink } from '../game-log-sink'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('gamelog:message', ({ message }) => {
      gameLogSink.push(message)
    })
    events.on('match:restarted', async ({ gameNumber }) => {
      await pruneLogs(gameNumber)
    })
  },
  { name: 'game log collector', encapsulate: true },
)

async function pruneLogs(number: GameNumber) {
  const game = await findOne({ number }, ['logSecret'])
  if (!game.logSecret) {
    return
  }

  await gameLogSink.clear(game.logSecret)
}
