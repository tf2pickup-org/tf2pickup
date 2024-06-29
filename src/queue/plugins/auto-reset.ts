import fp from 'fastify-plugin'
import { events } from '../../events'
import { reset } from '../reset'
import { applyMapCooldown } from '../apply-map-cooldown'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:created', async ({ game }) => {
      await applyMapCooldown(game.map)
      await reset()
    })
  },
  {
    name: 'auto reset',
  },
)
