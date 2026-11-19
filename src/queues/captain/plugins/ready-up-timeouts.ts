import fp from 'fastify-plugin'
import { tasks } from '../../../tasks'
import { readyTimeout } from '../ready-timeout'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    tasks.register('queue/captain:readyUpTimeout', async ({ queue, token }) => {
      await readyTimeout(queue, token, 'readyUp')
    })
    tasks.register('queue/captain:readyStateTimeout', async ({ queue, token }) => {
      await readyTimeout(queue, token, 'state')
    })
  },
  { name: 'captain ready up timeouts' },
)
