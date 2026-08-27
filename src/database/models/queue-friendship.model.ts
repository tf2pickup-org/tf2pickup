import type { Gamemode } from '../../shared/types/gamemode'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface QueueFriendshipModel {
  gamemode: Gamemode
  source: SteamId64
  target: SteamId64
}
