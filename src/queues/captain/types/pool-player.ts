import type { SteamId64 } from '../../../shared/types/steam-id-64'

export interface PoolPlayer {
  player: { steamId: SteamId64 }
  roles: readonly string[]
  volunteer: boolean
  joinedAt: Date
}
