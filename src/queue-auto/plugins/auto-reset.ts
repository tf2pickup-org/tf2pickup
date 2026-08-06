import fp from 'fastify-plugin'
import { events } from '../../events'
import { reset } from '../reset'
import { applyMapCooldown } from '../../maps/apply-cooldown'
import { queue } from '../../queue'
import { QueueMode } from '../../shared/types/queue-mode'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:created', async ({ game }) => {
      // Captain mode clears its own pool and reopens its own queue — running this as well would
      // apply the map cooldown twice.
      if ((await queue.getMode()) !== QueueMode.auto) {
        return
      }

      await applyMapCooldown(game.map)
      await reset()
    })
  },
  {
    name: 'auto reset',
  },
)
