import type { PlayerSkill } from '../database/models/player.model'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'

export function effectiveSkill(
  playerSkill: PlayerSkill | undefined,
  defaultSkill: PlayerSkill | undefined,
  gameClass: Tf2ClassName,
): number {
  return playerSkill?.[gameClass] ?? defaultSkill?.[gameClass] ?? 1
}
