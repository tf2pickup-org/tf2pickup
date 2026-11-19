import fp from 'fastify-plugin'
import { events } from '../../../events'
import { safe } from '../../../utils/safe'
import { queuePage } from '../../page'
import { get } from '../../get'
import { getState } from '../../get-state'
import { getPool } from '../get-pool'
import { QueueState } from '../../../database/models/queue-state.model'
import { ReadyUpDialog } from '../../views/html/ready-up-dialog'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    events.on(
      'queue/captainPool:updated',
      safe(async ({ queue }) => {
        await queuePage.update(app.gateway, queue, { captainPool: true, counts: true })
      }),
    )
    events.on('queue/captainPool:left', async ({ player }) => {
      const close = await ReadyUpDialog.close()
      app.gateway.to({ player }).send(() => close, { key: 'ready-up-dialog' })
    })
    events.on(
      'queue/state:updated',
      safe(async ({ queue, state }) => {
        if ((await get(queue)).launchMode !== 'captain' || (await getState(queue)) !== state) return
        const pool = await getPool(queue)
        if (state === QueueState.ready) {
          const players = pool.filter(member => !member.ready).map(member => member.player.steamId)
          app.gateway
            .to({ players })
            .send(actor => ReadyUpDialog.show(actor!, queue), { key: 'ready-up-dialog' })
        } else {
          const close = await ReadyUpDialog.close()
          app.gateway
            .to({ players: pool.map(member => member.player.steamId) })
            .send(() => close, { key: 'ready-up-dialog' })
        }
      }),
    )
  },
  { name: 'captain update clients' },
)
