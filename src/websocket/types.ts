import type { WebSocket } from '@fastify/websocket'
import type { SteamId64 } from '../shared/types/steam-id-64'

// Match the socket type Fastify supplies. A direct ws import resolves to its ESM declaration.
export type AppWebSocket = WebSocket & {
  id: string
  isAlive: boolean
  currentUrl?: string
  page?: number
  audioReady?: boolean
  player?: {
    steamId: SteamId64
  }
}
