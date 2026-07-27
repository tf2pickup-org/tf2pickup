import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { Tf2Team } from '../../shared/types/tf2-team'

export interface TeamSlot {
  team: Tf2Team
  gameClass: Tf2ClassName
}
