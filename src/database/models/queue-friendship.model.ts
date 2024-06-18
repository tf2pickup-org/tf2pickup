import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface QueueFriendshipModel {
  source: SteamId64
  target: SteamId64
}
