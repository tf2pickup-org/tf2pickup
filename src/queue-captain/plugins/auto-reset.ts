import fp from 'fastify-plugin'
import { configuration } from '../../configuration'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { reset } from '../reset'

export default fp(
  async () => {
    let isActive = (await configuration.get('queue.mode')) === 'captain'

    events.on('queue/mode:changed', ({ mode }) => {
      isActive = mode === 'captain'
    })

    events.on(
      'game:created',
      safe(async () => {
        if (!isActive) return
        await reset()
      }),
    )
  },
  { name: 'captain auto reset' },
)
