import type { GameSlotModel } from '../../../database/models/game-slot.model'
import type { QueueModel } from '../../../database/models/queue.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

export interface CaptainLaunchSnapshot {
  queue: QueueModel
  token: string
  slots: GameSlotModel[]
  map: string
  captains: { red: SteamId64; blu: SteamId64 }
}
