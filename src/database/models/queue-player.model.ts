import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface QueuePlayerModel {
  steamId: SteamId64
  offeredClasses: Tf2ClassName[]
  wantsCaptain: boolean
  joinedAt: Date
  ready: boolean
}
