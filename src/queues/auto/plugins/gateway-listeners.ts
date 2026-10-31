import fp from 'fastify-plugin'
import { collections } from '../../../database/collections'
import { QueueSlot } from '../views/html/queue-slot'
import { join } from '../join'
import { leave } from '../leave'
import { readyUp } from '../ready-up'
import { ReadyUpDialog } from '../views/html/ready-up-dialog'
import { voteMap } from '../vote-map'
import { logError } from '../../../utils/log-error'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { markAsFriend } from '../mark-as-friend'
import { getState } from '../../get-state'
import { get } from '../../get'
import { QueueState } from '../../../database/models/queue-state.model'
import { preReady } from '../../../pre-ready'
import { errors } from '../../../errors'
import { IsInQueue } from '../views/html/is-in-queue'
import { MapVoteSelection } from '../views/html/map-vote-selection'
import { QueueSwitcher } from '../views/html/queue-switcher'
import { FlashMessage } from '../../../html/components/flash-message'
import type { AppWebSocket } from '../../../websocket/types'
import { players } from '../../../players'
import { queueWsCallDuration } from '../../metrics'
import { measureTime } from '../../../utils/measure-time'
import { byPageUrl } from '../../by-page-url'
import type { QueueModel } from '../../../database/models/queue.model'
import { listEnabled } from '../../list-enabled'
import { queuePageUrl } from '../../queue-page-url'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    async function refreshTakenSlots(queue: QueueModel, actorId: SteamId64) {
      const actor = await players.bySteamId(actorId, [
        'steamId',
        'bans',
        'activeGame',
        'skill',
        'verified',
        'roles',
      ])
      const slots = await collections.queueSlots
        .find({ queue: queue._id, player: { $ne: null } })
        .toArray()
      app.gateway
        .to({ player: actorId })
        .send(() => Promise.all(slots.map(slot => QueueSlot({ queue, slot, actor }))))
    }

    // each open queue page shows the membership for its own queue
    async function refreshMembership(actor: SteamId64) {
      for (const queue of await listEnabled()) {
        app.gateway
          .to({ player: actor })
          .to({ url: queuePageUrl(queue.slug) })
          .send(async () => [
            await IsInQueue({ queue: queue._id, actor }),
            await MapVoteSelection({ queue: queue._id, actor }),
            await QueueSwitcher({ active: queue, actor }),
          ])
      }
    }

    function wsSafe<Args extends unknown[]>(
      operation: string,
      fn: (socket: AppWebSocket, ...args: Args) => Promise<void>,
    ) {
      return (socket: AppWebSocket, ...args: Args) => {
        measureTime(
          async () => {
            await fn(socket, ...args)
          },
          ({ ms, result }) => {
            queueWsCallDuration.record(ms, {
              operation,
              result,
            })
          },
        ).catch(async (error: unknown) => {
          // Same levelling as the HTTP error handler (src/main.ts): client errors
          // (4xx) — queue races ('slot occupied'), invalid state, unauthorized —
          // are routine and not logged at error level. See logError.
          logError(error)
          if (error instanceof Error) {
            const msg = await FlashMessage({
              message: `Error: ${error.message}`,
              type: 'error',
            })
            socket.send(msg)
          }
        })
      }
    }

    app.gateway.on(
      'queue:join',
      wsSafe('join', async (socket, slotId) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const queue = await byPageUrl(socket.currentUrl)
        if (!queue) {
          throw errors.badRequest('not on a queue page')
        }
        const slots = await join(queue._id, slotId, socket.player.steamId)
        if (slots.find(s => s.canMakeFriendsWith?.length)) {
          await refreshTakenSlots(queue, socket.player.steamId)
        }

        await refreshMembership(socket.player.steamId)
      }),
    )

    app.gateway.on(
      'queue:leave',
      wsSafe('leave', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const slot = await leave(socket.player.steamId)
        if (slot.canMakeFriendsWith?.length) {
          await refreshTakenSlots(await get(slot.queue), socket.player.steamId)
        }

        await refreshMembership(socket.player.steamId)

        const queueState = await getState(slot.queue)
        if (queueState === QueueState.ready) {
          const close = await ReadyUpDialog.close()
          app.gateway.to({ player: socket.player.steamId }).send(() => close)
        }
      }),
    )

    app.gateway.on(
      'queue:readyup',
      wsSafe('readyup', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const [, close] = await Promise.all([readyUp(socket.player.steamId), ReadyUpDialog.close()])
        app.gateway.to({ player: socket.player.steamId }).send(() => close)
      }),
    )

    app.gateway.on(
      'queue:votemap',
      wsSafe('votemap', async (socket, map) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        const { queue } = await voteMap(socket.player.steamId, map)
        const { slug } = await get(queue)
        app.gateway
          .to({ player: socket.player.steamId })
          .to({ url: queuePageUrl(slug) })
          .send(async actor => await MapVoteSelection({ queue, actor }))
      }),
    )

    app.gateway.on(
      'queue:markasfriend',
      wsSafe('markasfriend', async (socket, steamId) => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        await markAsFriend(socket.player.steamId, steamId)
      }),
    )

    app.gateway.on(
      'queue:togglepreready',
      wsSafe('togglepreready', async socket => {
        if (!socket.player) {
          throw errors.unauthorized('unauthorized')
        }

        await preReady.toggle(socket.player.steamId)
      }),
    )
  },
  { name: 'queue gateway listeners' },
)
