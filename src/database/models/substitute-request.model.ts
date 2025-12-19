import type { GameSlotId } from '../../shared/types/game-slot-id'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { Tf2Team } from '../../shared/types/tf2-team'
import type { GameNumber } from './game.model'

export interface SubstituteRequestModel {
  gameNumber: GameNumber
  slotId: GameSlotId
  team: Tf2Team
  gameClass: Tf2ClassName
}
