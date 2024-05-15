import EventEmitter from 'node:events'
import { WebSocket } from 'ws'
import { z } from 'zod'

export interface ClientToServerEvents {
  'queue:join': (slotId: number) => void
  'queue:leave': () => void
  'queue:votemap': (mapName: string) => void
  'queue:readyup': () => void
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

export class Gateway extends EventEmitter {
  override on<T extends keyof GatewayEvents>(
    eventName: T,
    listener: (socket: WebSocket, ...args: GatewayEventParams<T>) => void,
  ): this {
    super.on(eventName, listener)
    return this
  }

  parse(socket: WebSocket, message: string) {
    try {
      const parsed = joinQueue.parse(JSON.parse(message))
      this.emit('queue:join', socket, parsed.join)
    } catch (error) {
      console.error(error)
    }
  }
}
