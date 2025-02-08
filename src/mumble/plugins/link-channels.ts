import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { linkChannels } from '../link-channels'

export default fp(
  async () => {
    events.on(
      'game:ended',
      safe(async ({ game }) => {
        await linkChannels(game)
      }),
    )
  },
  {
    name: 'auto link channels',
  },
)
