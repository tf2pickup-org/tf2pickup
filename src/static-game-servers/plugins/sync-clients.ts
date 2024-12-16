import fp from 'fastify-plugin'
import { events } from '../../events'
import { StaticGameServerList } from '../../admin/game-servers/views/html/static-game-server-list'

export default fp(async app => {
  events.on('staticGameServer:updated', () => {
    const list = StaticGameServerList()
    app.gateway.broadcast(() => list)
  })

  events.on('staticGameServer:added', () => {
    const list = StaticGameServerList()
    app.gateway.broadcast(() => list)
  })
})
