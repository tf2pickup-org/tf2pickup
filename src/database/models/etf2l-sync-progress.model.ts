import type { ObjectId } from 'mongodb'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export const ETF2L_SYNC_PROGRESS_ID = 'players.etf2l-profile-sync' as const

export interface Etf2lSyncProgressModel {
  processed: number
  updated: number
  removed: number
  skipped: number
  lastSteamId?: SteamId64
  lastPlayerObjectId?: ObjectId
  startedAt: Date
  lastUpdatedAt: Date
}

export type Etf2lSyncProgressDocument = Etf2lSyncProgressModel & {
  _id: typeof ETF2L_SYNC_PROGRESS_ID
}
