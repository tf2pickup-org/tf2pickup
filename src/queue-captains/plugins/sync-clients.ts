import fp from 'fastify-plugin'
import { events } from '../../events'
import { getMode } from '../../queue/get-mode'
import { QueueMode } from '../../shared/types/queue-mode'
import { safe } from '../../utils/safe'
import type { AppWebSocket } from '../../websocket/types'
import { ClassPicker } from '../views/html/class-picker'
import { PoolList } from '../views/html/pool-list'
import { ReadinessMeter } from '../views/html/readiness-meter'

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    // The pool is a single list rather than a grid of addressable slots, so it is re-rendered
    // whole. At a couple dozen entries that is cheaper than tracking per-entry diffs.
    const refreshPool = safe(async () => {
      if ((await getMode()) !== QueueMode.captains) {
        return
      }

      const meter = await ReadinessMeter()
      app.gateway
        .to({ url: '/' })
        .send(async actor => [meter, await PoolList({ actor }), await ClassPicker({ actor })])
    })

    events.on('queueCaptains/pool:updated', refreshPool)
    events.on('queueCaptains/pool:left', refreshPool)

    async function syncQueuePage(socket: AppWebSocket) {
      if ((await getMode()) !== QueueMode.captains) {
        return
      }

      socket.send(await ReadinessMeter())
      socket.send(await PoolList({ actor: socket.player?.steamId }))
      socket.send(await ClassPicker({ actor: socket.player?.steamId }))
    }

    app.gateway.on('ready', async socket => {
      if (socket.currentUrl === '/') {
        await syncQueuePage(socket)
      }
    })

    app.gateway.on('navigated', async (socket, url) => {
      if (url === '/') {
        await syncQueuePage(socket)
      }
    })
  },
  { name: 'captains queue sync clients' },
)
