import type { FastifyInstance } from 'fastify'
import EventEmitter from 'node:events'
import { WebSocket } from 'ws'
import { z } from 'zod'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { assertIsError } from '../utils/assert-is-error'
import { logger } from '../logger'
import type { QueueSlotId } from '../queue/types/queue-slot-id'

export interface ClientToServerEvents {
  connected: (ipAddress: string, userAgent?: string) => void
  ready: () => void
  navigated: (url: string) => void
  'queue:join': (slotId: QueueSlotId) => void
  'queue:leave': () => void
  'queue:votemap': (mapName: string) => void
  'queue:readyup': () => void
  'queue:markasfriend': (steamId: SteamId64 | null) => void
  'queue:togglepreready': () => void
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
  join: z.string().regex(/^\w+-\d$/),
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
  markasfriend: z.union([z.string(), z.null()]),
  HEADERS: htmxHeaders,
})

const preReadyToggle = z.object({
  prereadytoggle: z.string(),
  HEADERS: htmxHeaders,
})

const navigated = z.object({
  navigated: z.string(),
  HEADERS: htmxHeaders.optional(),
})

const clientMessage = z.union([
  joinQueue,
  leaveQueue,
  readyUp,
  voteMap,
  markAsFriend,
  preReadyToggle,
  navigated,
])

type MessageFn = (
  player: SteamId64 | undefined,
) => string | string[] | undefined | Promise<string | string[] | undefined>
interface Broadcaster {
  broadcast: (messageFn: MessageFn) => void
}

async function sendSafe(client: WebSocket, msg: string) {
  return new Promise<void>((resolve, reject) => {
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
}

async function send(client: WebSocket, message: MessageFn) {
  try {
    const m = await message(client.player?.steamId)
    if (!m) {
      return
    }

    if (Array.isArray(m)) {
      for (const msg of m) {
        await sendSafe(client, msg)
      }
    } else {
      await sendSafe(client, m)
    }
  } catch (error) {
    assertIsError(error)
    logger.error(error)
  }
}

interface Filters {
  authenticated?: boolean
  players?: Set<SteamId64>
  urls?: Set<string>
}
type UserFilters =
  | { authenticated: boolean }
  | { player: SteamId64 }
  | { players: SteamId64[] }
  | { url: string }
  | { urls: string[] }

function mergeFilters(base: Filters, additional: UserFilters) {
  if ('authenticated' in additional) {
    base.authenticated = additional.authenticated
  }

  if ('player' in additional) {
    base.players ??= new Set()
    base.players.add(additional.player)
  }

  if ('players' in additional) {
    base.players ??= new Set()
    additional.players.forEach(player => base.players!.add(player))
  }

  if ('url' in additional) {
    base.urls ??= new Set()
    base.urls.add(additional.url)
  }

  if ('urls' in additional) {
    base.urls ??= new Set()
    additional.urls.forEach(url => base.urls!.add(url))
  }
  return base
}

class BroadcastOperator {
  constructor(
    public readonly app: FastifyInstance,
    private readonly filters: Filters,
  ) {}

  to(filter: UserFilters) {
    return new BroadcastOperator(this.app, mergeFilters(this.filters, filter))
  }

  send(message: MessageFn) {
    this.app.websocketServer.clients.forEach(async client => {
      if ('authenticated' in this.filters) {
        if (Boolean(client.player) !== this.filters.authenticated) {
          return
        }
      }

      if (this.filters.players) {
        if (!client.player || !this.filters.players.has(client.player.steamId)) {
          return
        }
      }

      if (this.filters.urls) {
        if (!this.filters.urls.has(client.currentUrl)) {
          return
        }
      }
      await send(client, message)
    })
  }
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

  broadcast(message: MessageFn) {
    this.app.websocketServer.clients.forEach(async client => {
      await send(client, message)
    })
  }

  to(filter: UserFilters): BroadcastOperator {
    return new BroadcastOperator(this.app, mergeFilters({}, filter))
  }

  parse(socket: WebSocket, message: string) {
    try {
      const parsed = clientMessage.parse(JSON.parse(message))
      if ('navigated' in parsed) {
        if (!socket.currentUrl) {
          socket.currentUrl = parsed.navigated
          this.emit('ready', socket)
        } else {
          socket.currentUrl = parsed.navigated
          this.emit('navigated', socket, parsed.navigated)
        }
        return
      }

      if (!socket.player) {
        return
      }

      // all the other calls are for authenticated clients only
      if ('join' in parsed) {
        this.emit('queue:join', socket, parsed.join)
      } else if ('leave' in parsed) {
        this.emit('queue:leave', socket)
      } else if ('ready' in parsed) {
        this.emit('queue:readyup', socket)
      } else if ('votemap' in parsed) {
        this.emit('queue:votemap', socket, parsed.votemap)
      } else if ('markasfriend' in parsed) {
        this.emit('queue:markasfriend', socket, parsed.markasfriend)
      } else if ('prereadytoggle' in parsed) {
        this.emit('queue:togglepreready', socket)
      }
    } catch (error) {
      logger.error({ error }, `failed to parse message: ${message}`)
    }
  }
}
