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
    // drop pre-restart log lines so the log uploaded to logs.tf contains only
    // the restarted match and its parsed score agrees with ours
    events.on('game:restarted', async ({ game }) => {
      if (game.logSecret) {
        await gameLogSink.clear(game.logSecret)
      }
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
