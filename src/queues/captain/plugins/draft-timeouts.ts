import fp from 'fastify-plugin'
import { tasks } from '../../../tasks'
import { turnTimeout } from '../turn-timeout'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('queue/captain:turnTimeout', async ({ queue, token, turn }) => {
      await turnTimeout(queue, token, turn)
    })
  },
  { name: 'captain draft timeouts' },
)
