import fp from 'fastify-plugin'
import { events } from '../../events'
import { safe } from '../../utils/safe'
import { tasks } from '../../tasks'
import { cancel } from '../cancel'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('preReady:cancel', async ({ player }) => {
      await cancel(player)
    })

    events.on(
      'game:created',
      safe(async ({ game }) => {
        await Promise.all(
          game.slots.map(async ({ player }) => {
            await cancel(player)
          }),
        )
      }),
    )
  },
  {
    name: 'auto cancel pre-ready up',
  },
)
