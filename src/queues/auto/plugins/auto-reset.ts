import fp from 'fastify-plugin'
import { events } from '../../../events'
import { reset } from '../reset'
import { applyMapCooldown } from '../../../maps/apply-cooldown'
import { safe } from '../../../utils/safe'
import { recover } from '../recover'
import { queues } from '../..'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onReady', async () => {
      for (const { _id: queue, launchMode } of await queues.listEnabled()) {
        if (launchMode === 'auto') {
          await recover(queue)
        }
      }
    })

    events.on(
      'queue/game:created',
      safe(async ({ game }) => {
        if (!game.queue || game.launchMode === 'captain') {
          return
        }

        await applyMapCooldown(game.queue, game.map)
        await reset(game.queue)
      }),
    )
  },
  {
    name: 'auto reset',
  },
)
