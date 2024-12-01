import fp from 'fastify-plugin'
import { events } from '../../events'
import { whenGameEnds } from '../../games/when-game-ends'
import { safe } from '../../utils/safe'
import { linkChannels } from '../link-channels'

export default fp(
  async () => {
    events.on(
      'game:updated',
      safe(
        whenGameEnds(async ({ after }) => {
          await linkChannels(after)
        }),
      ),
    )
  },
  {
    name: 'auto link channels',
  },
)
