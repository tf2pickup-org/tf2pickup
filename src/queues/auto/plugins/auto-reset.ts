import fp from 'fastify-plugin'
import { events } from '../../../events'
import { reset } from '../reset'
import { applyMapCooldown } from '../../../maps/apply-cooldown'
import { safe } from '../../../utils/safe'
import { collections } from '../../../database/collections'
import { queues } from '../..'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    // a queue enabled outside the app (e.g. by the merge script) has no slots yet
    app.addHook('onReady', async () => {
      for (const queue of await queues.listEnabled()) {
        if (!(await collections.queueState.findOne({ queue: queue._id }))) {
          await reset(queue._id)
        }
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
