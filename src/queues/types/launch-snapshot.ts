import type { QueueModel } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface LaunchSnapshot {
  queue: QueueModel
  slots: QueueSlotModel[]
  map: string
  friends: SteamId64[][]
}
