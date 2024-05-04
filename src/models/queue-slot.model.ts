import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'

export interface QueueSlotModel {
  id: number
  gameClass: Tf2ClassName
  player: SteamId64 | null
  ready: boolean
  canMakeFriendsWith?: Tf2ClassName[]
}
