import fp from 'fastify-plugin'
import { events } from '../../events'
import { reset } from '../reset'
import { applyMapCooldown } from '../../maps/apply-cooldown'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:created', async ({ game }) => {
      await applyMapCooldown(game.map)
      await reset(game.gamemode)
    })
  },
  {
    name: 'auto reset',
  },
)
