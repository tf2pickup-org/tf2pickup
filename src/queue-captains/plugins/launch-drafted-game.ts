import fp from 'fastify-plugin'
import { collections } from '../../database/collections'
import { events } from '../../events'
import { assignGameServer } from '../../games/assign-game-server'
import { createFromSlots } from '../../games/create-from-slots'
import { configure } from '../../games/rcon/configure'
import { logger } from '../../logger'
import { applyMapCooldown } from '../../maps/apply-cooldown'
import { resetMapOptions } from '../../maps/reset-options'
import { config } from '../../queue-auto/config'
import { safe } from '../../utils/safe'
import { draftToSlots } from '../draft/draft-to-slots'
import { remainingMaps } from '../draft/remaining-maps'
import { unreadyPool } from '../unready-pool'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'queueCaptains/draft:completed',
      safe(async ({ draft }) => {
        const map = remainingMaps(draft)[0]
        if (map === undefined) {
          logger.error({ draft: draft.id }, 'draft finished with no map left standing')
          return
        }

        const game = await createFromSlots(draftToSlots(draft, config), map, draft.id)
        await collections.queueCaptainsDrafts.updateOne(
          { id: draft.id },
          { $set: { game: game.number } },
        )
        logger.info({ draft: draft.id, game: game.number, map }, 'drafted game created')

        // Only the drafted players leave. Whoever went unpicked keeps their place and their
        // classes, so sitting one out costs nothing but the wait.
        await collections.queueCaptainsPool.deleteMany({
          'player.steamId': { $in: game.slots.map(slot => slot.player) },
        })

        await applyMapCooldown(map)
        await resetMapOptions()
        await unreadyPool()

        await assignGameServer(game.number, { retries: 3 })
        void configure(game.number)
      }),
    )
  },
  { name: 'launch drafted game' },
)
