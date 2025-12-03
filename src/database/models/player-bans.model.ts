import type { PlayerBan } from './player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface PlayerBansModel {
  steamId: SteamId64
  bans: PlayerBan[]
}
