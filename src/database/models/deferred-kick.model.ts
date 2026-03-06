import type { GameSlotId } from '../../shared/types/game-slot-id'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { GameNumber } from './game.model'

export interface DeferredKickModel {
  gameNumber: GameNumber
  slotId: GameSlotId
  replacee: SteamId64
  replacement: SteamId64
}
