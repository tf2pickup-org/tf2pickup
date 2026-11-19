import fp from 'fastify-plugin'
import { queues } from '../..'
import { captainMachine } from '../machine'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onReady', async () => {
      for (const queue of await queues.listEnabled()) {
        if (queue.launchMode === 'captain') {
          await captainMachine.recover(queue)
        }
      }
    })
  },
  { name: 'captain recover drafts' },
)
