import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface OnlinePlayerModel {
  steamId: SteamId64
  name: string
}
