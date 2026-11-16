import type { WebSocket } from 'ws'
import type { SteamId64 } from '../shared/types/steam-id-64'

export type AppWebSocket = WebSocket & {
  id: string
  isAlive: boolean
  currentUrl?: string
  page?: number | undefined
  audioReady?: boolean
  player?: {
    steamId: SteamId64
  }
}
