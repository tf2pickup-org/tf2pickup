import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Gamemode } from '../../shared/types/gamemode'

export interface QueueFriendshipModel {
  gamemode: Gamemode
  source: SteamId64
  target: SteamId64
}
