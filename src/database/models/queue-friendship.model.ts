import type { QueueId } from './queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface QueueFriendshipModel {
  queue: QueueId
  source: SteamId64
  target: SteamId64
}
