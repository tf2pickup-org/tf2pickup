import type { FastifyInstance } from 'fastify'
import EventEmitter from 'node:events'
import { WebSocket } from 'ws'
import { z } from 'zod'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { assertIsError } from '../utils/assert-is-error'
import { logger } from '../logger'

export interface ClientToServerEvents {
  connected: (ipAddress: string, userAgent?: string) => void
  'queue:join': (slotId: number) => void
  'queue:leave': () => void
  'queue:votemap': (mapName: string) => void
  'queue:readyup': () => void
  'queue:markasfriend': (steamId: SteamId64 | null) => void
}

type GatewayEvents = ClientToServerEvents
type GatewayEventParams<T extends keyof GatewayEvents> = Parameters<GatewayEvents[T]>

const htmxHeaders = z.object({
  'HX-Request': z.string(),
  'HX-Trigger': z.string().nullable(),
  'HX-Trigger-Name': z.string().nullable(),
  'HX-Target': z.string().nullable(),
  'HX-Current-URL': z.string(),
})

const joinQueue = z.object({
  join: z.coerce.number(),
  HEADERS: htmxHeaders,
})

const leaveQueue = z.object({
  leave: z.literal(''),
  HEADERS: htmxHeaders,
})

const readyUp = z.object({
  ready: z.literal(''),
  HEADERS: htmxHeaders,
})

const voteMap = z.object({
  votemap: z.string(),
  HEADERS: htmxHeaders,
})

const markAsFriend = z.object({
  markasfriend: z.union([z.string(), z.literal('')]),
  HEADERS: htmxHeaders,
})

const clientMessage = z.union([joinQueue, leaveQueue, readyUp, voteMap, markAsFriend])

type MessageFn = (
  player: SteamId64 | undefined,
) => string | Promise<string> | string[] | Promise<string[]>
interface Broadcaster {
  broadcast: (messageFn: MessageFn) => void
}

export class Gateway extends EventEmitter implements Broadcaster {
  constructor(public readonly app: FastifyInstance) {
    super()
  }

  override on<T extends keyof GatewayEvents>(
    eventName: T,
    listener: (socket: WebSocket, ...args: GatewayEventParams<T>) => void,
  ): this {
    super.on(eventName, listener)
    return this
  }

  broadcast(messageFn: MessageFn) {
    this.app.websocketServer.clients.forEach(async client => {
      const send = async (msg: string) =>
        new Promise<void>((resolve, reject) => {
          if (client.readyState !== WebSocket.OPEN) {
            resolve()
            return
          }

          client.send(msg, err => {
            if (err) {
              if ('code' in err && err.code === 'EPIPE') {
                client.terminate()
                resolve()
                return
              }

              reject(err)
            } else {
              resolve()
            }
          })
        })

      try {
        const message = await messageFn(client.player?.steamId)
        if (Array.isArray(message)) {
          for (const msg of message) {
            await send(msg)
          }
        } else {
          await send(message)
        }
      } catch (error) {
        assertIsError(error)
        logger.error(error)
      }
    })
  }

  toPlayers(...players: SteamId64[]): Broadcaster {
    return {
      broadcast: (messageFn: MessageFn) => {
        this.app.websocketServer.clients.forEach(async client => {
          if (client.player && players.includes(client.player.steamId)) {
            const send = async (msg: string) =>
              new Promise<void>((resolve, reject) => {
                if (client.readyState !== WebSocket.OPEN) {
                  resolve()
                  return
                }

                client.send(msg, err => {
                  if (err) {
                    if ('code' in err && err.code === 'EPIPE') {
                      client.terminate()
                      resolve()
                      return
                    }

                    reject(err)
                  } else {
                    resolve()
                  }
                })
              })

            try {
              const message = await messageFn(client.player.steamId)
              if (Array.isArray(message)) {
                for (const msg of message) {
                  await send(msg)
                }
              } else {
                await send(message)
              }
            } catch (error) {
              assertIsError(error)
              logger.error(error)
            }
          }
        })
      },
    }
  }

  parse(socket: WebSocket, message: string) {
    try {
      const parsed = clientMessage.parse(JSON.parse(message))
      if ('join' in parsed) {
        this.emit('queue:join', socket, parsed.join)
      } else if ('leave' in parsed) {
        this.emit('queue:leave', socket)
      } else if ('ready' in parsed) {
        this.emit('queue:readyup', socket)
      } else if ('votemap' in parsed) {
        this.emit('queue:votemap', socket, parsed.votemap)
      } else if ('markasfriend' in parsed) {
        this.emit(
          'queue:markasfriend',
          socket,
          parsed.markasfriend === '' ? null : parsed.markasfriend,
        )
      }
    } catch (error) {
      console.error(error)
    }
  }
}
