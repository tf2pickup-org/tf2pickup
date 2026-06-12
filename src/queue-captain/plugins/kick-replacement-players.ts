import fp from 'fastify-plugin'
import { configuration } from '../../configuration'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { kick } from '../kick'

export default fp(
  async () => {
    let isActive = (await configuration.get('queue.mode')) === 'captain'

    events.on('queue/mode:changed', ({ mode }) => {
      isActive = mode === 'captain'
    })

    events.on(
      'game:playerReplaced',
      safe(async ({ replacement }) => {
        if (!isActive) return
        await kick(replacement)
      }),
    )
  },
  { name: 'captain kick replacement players' },
)
