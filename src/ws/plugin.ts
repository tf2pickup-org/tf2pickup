import fp from 'fastify-plugin'
import { logger } from '../logger'
import { Gateway } from './gateway'
import { SteamId64 } from '../shared/types/steam-id-64'
import { extractClientIp } from './extract-client-ip'

declare module 'ws' {
  interface WebSocket {
    player?: {
      steamId: SteamId64
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    gateway: Gateway
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  await app.register(await import('@fastify/websocket'), {
    options: {
      clientTracking: true,
    },
  })

  const gateway = new Gateway()
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
