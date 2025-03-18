import type { Tf2Team } from '../../shared/types/tf2-team'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { GameSlotId } from '../../shared/types/game-slot-id'

export enum SlotStatus {
  active = 'active',
  waitingForSubstitute = 'waiting for substitute',
}

export enum PlayerConnectionStatus {
  offline = 'offline',
  joining = 'joining',
  connected = 'connected',
}

export interface GameSlotModel {
  id: GameSlotId
  player: SteamId64
  team: Tf2Team
  gameClass: Tf2ClassName
  status: SlotStatus
  connectionStatus: PlayerConnectionStatus
  skill?: number
  shouldJoinBy?: Date
  voiceServerUrl?: string
}
