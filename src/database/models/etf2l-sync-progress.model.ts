import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface Etf2lSyncProgressModel {
  _id: string
  processed: number
  updated: number
  removed: number
  skipped: number
  lastSteamId?: SteamId64
  startedAt: Date
  lastUpdatedAt: Date
}
