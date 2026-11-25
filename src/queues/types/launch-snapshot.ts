import type { GameSlotModel } from '../../database/models/game-slot.model'
import type { QueueModel } from '../../database/models/queue.model'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

// token: the same launch replayed (after a crash) carries the same token, so it finds its game
export type LaunchSnapshot = { queue: QueueModel; token: string; map: string } & (
  | { slots: QueueSlotModel[]; friends: SteamId64[][] }
  | { slots: GameSlotModel[]; captains: { red: SteamId64; blu: SteamId64 } }
)
