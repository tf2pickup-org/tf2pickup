import fp from 'fastify-plugin'
import { logger } from '../logger'
import { Gateway } from './gateway'
import { extractClientIp } from './extract-client-ip'
import websocket from '@fastify/websocket'
import { secondsToMilliseconds } from 'date-fns'
import { nanoid } from 'nanoid'
import { meter } from '../otel'
import { ValueType } from '@opentelemetry/api'
import type { AppWebSocket } from './types'

declare module 'fastify' {
  interface FastifyInstance {
    gateway: Gateway
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
        const socket = client as AppWebSocket
        if (!socket.isAlive) {
          socket.terminate()
          return
        }

        socket.isAlive = false
        socket.ping()
      })
    }, secondsToMilliseconds(30))

    app.websocketServer.on('connection', client => {
      const socket = client as AppWebSocket
      socket.isAlive = true
      socket.on('error', logger.error)
      socket.on('pong', () => (socket.isAlive = true))
    })

    app.websocketServer.on('close', () => {
      clearInterval(isAliveInterval)
    })

    const gateway = new Gateway(app)
    app.decorate('gateway', gateway)

    app.get('/ws', { config: { otel: false }, websocket: true }, (socket, req) => {
      const client = socket as AppWebSocket
      client.id = nanoid()

      if (req.user) {
        client.player = {
          steamId: req.user.player.steamId,
        }
      }

      client.on('message', message => {
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
        gateway.parse(client, messageString)
      })

      const ipAddress = extractClientIp(req.headers) ?? req.socket.remoteAddress
      const userAgent = req.headers['user-agent']
      gateway.emit('connected', client, ipAddress, userAgent)
    })
  },
  { name: 'websockets' },
)
