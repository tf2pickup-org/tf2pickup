import fp from 'fastify-plugin'
import { events } from '../../../events'
import { safe } from '../../../utils/safe'
import { queuePage } from '../../page'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on(
      'queue/captainPool:updated',
      safe(async ({ queue }) => {
        await queuePage.update(app.gateway, queue, { captainPool: true, counts: true })
      }),
    )
  },
  { name: 'captain update clients' },
)
