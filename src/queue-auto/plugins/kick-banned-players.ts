import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { kick } from '../kick'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on(
      'player/ban:added',
      safe(async ({ player }) => {
        await kick(player)
      }),
    )
  },
  {
    name: 'kick banned players',
  },
)
