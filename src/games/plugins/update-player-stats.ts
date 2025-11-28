import fp from 'fastify-plugin'
import { events } from '../../events'
import { GameState } from '../../database/models/game.model'
import { SlotStatus } from '../../database/models/game-slot.model'
import { players } from '../../players'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:ended',
      safe(async ({ game }) => {
        // Only update stats for games that ended normally (not force-ended)
        if (game.state !== GameState.ended) {
          return
        }

        // Update stats for each player slot that was active
        await Promise.all(
          game.slots
            .filter(slot => slot.status === SlotStatus.active)
            .map(async slot => {
              await players.update(
                slot.player,
                {
                  $setOnInsert: {
                    'stats.totalGames': 0,
                    'stats.gamesByClass': {},
                  },
                  $inc: {
                    'stats.totalGames': 1,
                    [`stats.gamesByClass.${slot.gameClass}`]: 1,
                  },
                },
              )
            }),
        )
      }),
    )
  }
)

