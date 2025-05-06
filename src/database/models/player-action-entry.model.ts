import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface PlayerActionEntryModel {
  player: SteamId64
  ipAddress?: string | undefined
  userAgent?: string | undefined
  action: string
  timestamp: Date
}
