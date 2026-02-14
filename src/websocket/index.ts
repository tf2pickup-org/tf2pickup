import fp from 'fastify-plugin'
import { logger } from '../logger'
import { Gateway } from './gateway'
import { extractClientIp } from './extract-client-ip'
import websocket from '@fastify/websocket'
import { secondsToMilliseconds } from 'date-fns'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { nanoid } from 'nanoid'
import { meter } from '../otel'
import { ValueType } from '@opentelemetry/api'

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

    const clientCount = meter.createObservableUpDownCounter('tf2pickup.websocket.clients.count', {
      description: 'Number of websocket clients',
      unit: '1',
      valueType: ValueType.INT,
    })
    clientCount.addCallback(result => {
      result.observe(app.websocketServer.clients.size)
    })

    const incomingWsMessages = meter.createCounter('tf2pickup.websocket.incoming_message.count', {
      description: 'Messages received via websockets',
      unit: '1',
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

    // Update socket currentUrl based on HTTP requests with x-ws-id header
    app.addHook('onResponse', async (req, reply) => {
      const wsId = req.headers['x-ws-id']
      if (typeof wsId !== 'string') {
        return
      }
      // Only track successful HTML page responses (not API calls, assets, etc.)
      if (reply.statusCode < 200 || reply.statusCode >= 300) {
        return
      }

      const url = req.url.split('?')[0]!
      const client = [...app.websocketServer.clients].find(c => c.id === wsId)
      if (!client) {
        return
      }

      const previousUrl = client.currentUrl
      client.currentUrl = url

      if (!previousUrl) {
        gateway.emit('ready', client)
      } else if (previousUrl !== url) {
        gateway.emit('navigated', client, url)
      }
    })

    app.get('/ws', { config: { otel: false }, websocket: true }, (socket, req) => {
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
        incomingWsMessages.add(1, {
          steamId: req.user?.player.steamId,
        })
        gateway.parse(socket, messageString)
      })

      const ipAddress = extractClientIp(req.headers) ?? req.socket.remoteAddress
      const userAgent = req.headers['user-agent']
      gateway.emit('connected', socket, ipAddress, userAgent)

      // Send socket ID to client for HTTP header correlation
      socket.send(JSON.stringify({ socketId: socket.id }))
    })
  },
  { name: 'websockets' },
)
