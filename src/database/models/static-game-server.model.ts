import type { GameNumber } from './game.model'

export interface StaticGameServerModel {
  id: string
  createdAt: Date
  name: string
  address: string
  port: string
  rconPassword: string
  internalIpAddress: string

  isOnline: boolean
  lastHeartbeatAt: Date
  game?: GameNumber

  priority: number
}
