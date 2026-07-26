import fp from 'fastify-plugin'
import { watchMode } from '../../queue/watch-mode'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { kick } from '../kick'

export default fp(
  async () => {
    const isActive = await watchMode('captain')

    events.on(
      'game:playerReplaced',
      safe(async ({ replacement }) => {
        if (!isActive()) return
        await kick(replacement)
      }),
    )
  },
  { name: 'captain kick replacement players' },
)
