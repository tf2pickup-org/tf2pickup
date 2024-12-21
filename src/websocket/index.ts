import fp from 'fastify-plugin'
import { logger } from '../logger'
import { Gateway } from './gateway'
import { extractClientIp } from './extract-client-ip'
import websocket from '@fastify/websocket'
import { secondsToMilliseconds } from 'date-fns'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { nanoid } from 'nanoid'

declare module 'fastify' {
  interface FastifyInstance {
    gateway: Gateway
  }
}

declare module 'ws' {
  export default interface WebSocket {
    id: string
    isAlive: boolean
    currentUrl: string
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
      app.websocketServer.clients.forEach(client => {
        if (!client.isAlive) {
          client.terminate()
          return
        }

        client.isAlive = false
        client.ping()
      })
    }, secondsToMilliseconds(30))

    app.websocketServer.on('connection', client => {
      client.isAlive = true
      client.on('error', logger.error)
      client.on('pong', () => (client.isAlive = true))
    })

    app.websocketServer.on('close', () => {
      clearInterval(isAliveInterval)
    })

    const gateway = new Gateway(app)
    app.decorate('gateway', gateway)

    app.get('/ws', { websocket: true }, (socket, req) => {
      socket.id = nanoid()

      if (req.user) {
        socket.player = {
          steamId: req.user.player.steamId,
        }
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
        gateway.parse(socket, messageString)
      })

      const ipAddress = extractClientIp(req.headers) ?? req.socket.remoteAddress
      const userAgent = req.headers['user-agent']
      gateway.emit('connected', socket, ipAddress, userAgent)
    })
  },
  { name: 'websockets' },
)
