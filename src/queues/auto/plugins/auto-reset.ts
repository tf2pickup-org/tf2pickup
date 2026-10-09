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
      for (const { _id: queue } of await queues.listEnabled()) {
        await recover(queue)
      }
    })

    events.on(
      'game:created',
      safe(async ({ game }) => {
        if (!game.queue) {
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
