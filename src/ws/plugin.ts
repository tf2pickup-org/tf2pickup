import fp from 'fastify-plugin'
import { logger } from '../logger'
import { Gateway } from './gateway'
import { extractClientIp } from './extract-client-ip'
import websocket from '@fastify/websocket'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  await app.register(websocket, {
    options: {
      clientTracking: true,
      perMessageDeflate: false,
    },
  })

  const gateway = new Gateway(app)
  app.decorate('gateway', gateway)

  app.get('/ws', { websocket: true }, (socket, req) => {
    if (req.user) {
      socket.player = {
        steamId: req.user.player.steamId,
      }

      socket.on('message', message => {
        logger.trace(`${req.user!.player.name}: ${message.toLocaleString()}`)
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        gateway.parse(socket, message.toString())
      })
    }

    const ipAddress = extractClientIp(req.headers) ?? req.socket.remoteAddress
    gateway.emit('connected', socket, ipAddress)
  })
})
