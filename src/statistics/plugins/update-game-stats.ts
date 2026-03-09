import fp from 'fastify-plugin'
import { events } from '../../events'
import { GameState } from '../../database/models/game.model'
import { GameEventType } from '../../database/models/game-event.model'
import { collections } from '../../database/collections'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:ended',
      safe(async ({ game }) => {
        if (game.state !== GameState.ended) {
          return
        }

        const startedEvent = game.events.find(e => e.event === GameEventType.gameStarted)
        const endedEvent = game.events.find(e => e.event === GameEventType.gameEnded)

        if (!startedEvent || !endedEvent) {
          return
        }

        const durationMs = endedEvent.at.getTime() - startedEvent.at.getTime()

        await collections.stats.updateOne(
          { _id: 'total' },
          { $inc: { totalDurationMs: durationMs } },
          { upsert: true },
        )
      }),
    )
  },
)
