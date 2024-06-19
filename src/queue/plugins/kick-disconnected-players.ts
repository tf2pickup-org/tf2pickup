import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { kick } from '../kick'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('player:disconnected', async ({ steamId }) => {
      await safe(async () => {
        await kick(steamId)
      })
    })
  },
  { name: 'kick disconnected players' },
)
