import type { QueueId } from './queue.model'
import type { QueueSlotId } from '../../queues/types/queue-slot-id'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'

export interface QueueSlotModel {
  queue: QueueId
  id: QueueSlotId
  gameClass: Tf2ClassName
  player: null | {
    steamId: SteamId64
    name: string
    avatarUrl: string // medium
  }
  ready: boolean
  canMakeFriendsWith?: Tf2ClassName[]
}
