import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { setupGameChannels } from '../setup-game-channels'
import { logger } from '../../logger'
import { games } from '../../games'
import { mumbleDirectUrl } from '../mumble-direct-url'
import { collections } from '../../database/collections'

export default fp(
  async () => {
    events.on(
      'game:created',
      safe(async ({ game }) => {
        await setupGameChannels(game)
        logger.info({ game }, 'channels for game created')
      }),
    )

    events.on(
      'game:playerReplaced',
      safe(async ({ game, replacement }) => {
        const r = await collections.players.findOne({ steamId: replacement })
        if (!r) {
          throw new Error(`replacee player not found: ${r}`)
        }

        await games.update(
          game.number,
          {
            $set: {
              'slots.$[slot].voiceServerUrl': (await mumbleDirectUrl(game, replacement)).toString(),
            },
          },
          {
            arrayFilters: [
              {
                'slot.player': { $eq: r._id },
              },
            ],
          },
        )
      }),
    )
  },
  { name: 'auto create channels' },
)
