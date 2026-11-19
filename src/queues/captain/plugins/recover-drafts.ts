import fp from 'fastify-plugin'
import { queues } from '../..'
import { recoverDraft } from '../recover-draft'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.addHook('onReady', async () => {
      for (const queue of await queues.listEnabled()) {
        if (queue.launchMode === 'captain') {
          await recoverDraft(queue)
        }
      }
    })
  },
  { name: 'captain recover drafts' },
)
