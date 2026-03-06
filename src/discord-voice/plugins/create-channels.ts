import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { logger } from '../../logger'
import { setupGameChannels } from '../setup-game-channels'
import { syncGameChannels } from '../sync-game-channels'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:created',
      safe(async ({ game }) => {
        const updatedGame = await setupGameChannels(game)
        if (updatedGame !== game) {
          logger.info({ gameNumber: game.number }, 'discord voice channels created')
        }
      }),
    )

    events.on(
      'game:playerReplaced',
      safe(async ({ game }) => {
        await syncGameChannels(game)
      }),
    )
  },
  { name: 'discord voice - auto create channels' },
)
