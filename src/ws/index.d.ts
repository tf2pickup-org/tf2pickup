import type { Gateway } from './gateway'
import type { SteamId64 } from '../shared/types/steam-id-64'

declare module 'fastify' {
  import { FastifyInstance } from 'fastify'
  interface FastifyInstance {
    gateway: Gateway
  }
}

declare module 'ws' {
  import * as WebSocket from 'ws'
  interface WebSocket {
    isAlive: boolean
    player?: {
      steamId: SteamId64
    }
  }
}
