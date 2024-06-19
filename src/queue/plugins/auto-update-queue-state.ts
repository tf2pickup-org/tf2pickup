import fp from 'fastify-plugin'
import { events } from '../../events'
import { maybeUpdateQueueState } from '../maybe-update-queue-state'
import { safe } from '../../utils/safe'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    events.on('queue/slots:updated', async () => {
      await safe(async () => {
        await maybeUpdateQueueState()
      })
    })
  },
  { name: 'auto update queue state' },
)
