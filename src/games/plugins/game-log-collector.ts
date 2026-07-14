import fp from 'fastify-plugin'
import { events } from '../../events'
import { gameLogSink } from '../game-log-sink'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('gamelog:message', ({ message }) => {
      gameLogSink.push(message)
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
