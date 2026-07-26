import fp from 'fastify-plugin'
import { configuration } from '../../configuration'
import { events } from '../../events'
import { applyMapCooldown } from '../../maps/apply-cooldown'
import { reset as resetAutoQueue } from '../../queue-auto/reset'
import { reset as resetCaptainQueue } from '../../queue-captain/reset'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'game:created',
      safe(async ({ game }) => {
        await applyMapCooldown(game.map)
        const mode = await configuration.get('queue.mode')
        await (mode === 'captain' ? resetCaptainQueue() : resetAutoQueue())
      }),
    )
  },
  { name: 'reset queue after launch' },
)
