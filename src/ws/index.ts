import fp from 'fastify-plugin'
import { logger } from '../logger'
import { Gateway } from './gateway'
import { extractClientIp } from './extract-client-ip'
import websocket from '@fastify/websocket'
import { WebSocket } from 'ws'
import { secondsToMilliseconds } from 'date-fns'
import type { SteamId64 } from '../shared/types/steam-id-64'

declare module 'fastify' {
  interface FastifyInstance {
    gateway: Gateway
  }
}

declare module 'ws' {
  interface WebSocket {
    isAlive: boolean
    player?: {
      steamId: SteamId64
    }
  }
}

export default fp(
  async app => {
    await app.register(websocket, {
      options: {
        clientTracking: true,
      },
    })

    const isAliveInterval = setInterval(() => {
      logger.trace('ws ping')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ;(app.websocketServer.clients as Set<WebSocket>).forEach(client => {
        if (!client.isAlive) {
          client.terminate()
          return
        }

        client.isAlive = false
        client.ping()
      })
    }, secondsToMilliseconds(30))

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    app.websocketServer.on('connection', (client: WebSocket) => {
      client.isAlive = true
      client.on('error', logger.error)
      client.on('pong', () => (client.isAlive = true))
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    app.websocketServer.on('close', () => {
      clearInterval(isAliveInterval)
    })

    const gateway = new Gateway(app)
    app.decorate('gateway', gateway)

    app.get('/ws', { websocket: true }, (socket, req) => {
      if (req.user) {
        socket.player = {
          steamId: req.user.player.steamId,
        }

        socket.on('message', message => {
          let messageString: string
          if (Array.isArray(message)) {
            messageString = Buffer.concat(message).toString()
          } else if (message instanceof ArrayBuffer) {
            messageString = Buffer.from(message).toString()
          } else {
            messageString = message.toString()
          }
          logger.trace(`${req.user!.player.name}: ${messageString}`)
          gateway.parse(socket, messageString)
        })
      }

      const ipAddress = extractClientIp(req.headers) ?? req.socket.remoteAddress
      const userAgent = req.headers['user-agent']
      gateway.emit('connected', socket, ipAddress, userAgent)
    })
  },
  { name: 'websockets' },
)
