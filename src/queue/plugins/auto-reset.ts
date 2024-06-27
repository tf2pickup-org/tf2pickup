import fp from 'fastify-plugin'
import { events } from '../../events'
import { reset } from '../reset'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('game:created', async () => {
      await reset()
    })
  },
  {
    name: 'auto reset',
  },
)
