import fp from 'fastify-plugin'
import { errors } from '../../../errors'
import { byPageUrl } from '../../page/by-page-url'
import { queuePage } from '../../page'
import { wsSafe } from '../../ws-safe'
import { pick } from '../pick'
import { toggleRole } from '../toggle-role'
import { toggleVolunteer } from '../toggle-volunteer'
import { ReadyUpDialog } from '../../auto/views/html/ready-up-dialog'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    app.gateway.on(
      'queue:togglerole',
      wsSafe('togglerole', async (socket, role) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const queue = await byPageUrl(socket.currentUrl)
        if (!queue) {
          throw errors.badRequest('not on a queue page')
        }

        const actor = socket.player.steamId
        await toggleRole(queue._id, actor, role)
        const close = await ReadyUpDialog.close()
        app.gateway.to({ player: actor }).send(() => close, { key: 'ready-up-dialog' })
        await queuePage.updateAll(app.gateway, { membership: true }, { players: [actor] })
      }),
    )

    app.gateway.on(
      'queue:togglevolunteer',
      wsSafe('togglevolunteer', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const queue = await byPageUrl(socket.currentUrl)
        if (!queue) {
          throw errors.badRequest('not on a queue page')
        }

        await toggleVolunteer(queue._id, socket.player.steamId)
        const close = await ReadyUpDialog.close()
        app.gateway
          .to({ player: socket.player.steamId })
          .send(() => close, { key: 'ready-up-dialog' })
      }),
    )

    app.gateway.on(
      'queue:pick',
      wsSafe('pick', async (socket, player, role) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const queue = await byPageUrl(socket.currentUrl)
        if (!queue) {
          throw errors.badRequest('not on a queue page')
        }

        await pick(queue._id, socket.player.steamId, player, role)
      }),
    )
  },
  { name: 'captain gateway listeners' },
)
