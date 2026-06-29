import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { PlayerRole } from './player.model'

export interface OnlinePlayerModel {
  steamId: SteamId64
  name: string
  avatar: string
  roles: PlayerRole[]
}
