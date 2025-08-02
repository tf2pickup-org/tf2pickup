import fp from 'fastify-plugin'
import { events } from '../../events'
import { StaticGameServerList } from '../../admin/game-servers/views/html/static-game-server-list'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  events.on('staticGameServer:updated', () => {
    const list = StaticGameServerList()
    app.gateway.to({ url: '/admin/game-servers' }).send(() => list)
  })

  events.on('staticGameServer:added', () => {
    const list = StaticGameServerList()
    app.gateway.to({ url: '/admin/game-servers' }).send(() => list)
  })
})
