import fp from 'fastify-plugin'
import { events } from '../../../events'
import { reset } from '../reset'
import { applyMapCooldown } from '../../../maps/apply-cooldown'
import { safe } from '../../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
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
