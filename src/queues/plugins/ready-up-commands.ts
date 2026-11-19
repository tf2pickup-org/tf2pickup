import fp from 'fastify-plugin'
import { QueueState } from '../../database/models/queue-state.model'
import { errors } from '../../errors'
import { leave as autoLeave } from '../auto/leave'
import { readyUp as autoReadyUp } from '../auto/ready-up'
import { ReadyUpDialog } from '../views/html/ready-up-dialog'
import { leave as captainLeave } from '../captain/leave'
import { readyUp as captainReadyUp } from '../captain/ready-up'
import { getState } from '../get-state'
import { membership } from '../membership'
import { queuePage } from '../page'
import { wsSafe } from '../ws-safe'

// The existing dialog emits the same commands in both modes. Dispatch by the
// player's actual membership, so only one engine ever handles each action.
export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.gateway.on(
      'queue:readyup',
      wsSafe('readyup', async socket => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        const actor = socket.player.steamId
        const member = await membership(actor)
        if (member?.launchMode === 'captain') await captainReadyUp(member.queue, actor)
        else await autoReadyUp(actor)
        const close = await ReadyUpDialog.close()
        app.gateway.to({ player: actor }).send(() => close, { key: 'ready-up-dialog' })
      }),
    )

    app.gateway.on(
      'queue:leave',
      wsSafe('leave', async socket => {
        if (!socket.player) throw errors.unauthorized('unauthorized')
        const actor = socket.player.steamId
        const member = await membership(actor)
        if (member?.launchMode === 'captain') {
          await captainLeave(member.queue, actor)
          const close = await ReadyUpDialog.close()
          app.gateway.to({ player: actor }).send(() => close, { key: 'ready-up-dialog' })
        } else {
          const slot = await autoLeave(actor)
          if (slot.canMakeFriendsWith?.length) {
            await queuePage.update(
              app.gateway,
              slot.queue,
              { slots: 'taken' },
              { players: [actor] },
            )
          }
          if ((await getState(slot.queue)) === QueueState.ready) {
            const close = await ReadyUpDialog.close()
            app.gateway.to({ player: actor }).send(() => close, { key: 'ready-up-dialog' })
          }
        }
        await queuePage.updateAll(app.gateway, { membership: true }, { players: [actor] })
      }),
    )
  },
  { name: 'queue ready up commands' },
)
