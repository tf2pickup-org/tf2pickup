import type { PlayerBan, PlayerModel } from '../../database/models/player.model'
import { isActive } from './is-active'
import { restrictionField } from './restriction-field'
import type { RestrictionKind } from './restriction-kind'

export function active<K extends RestrictionKind>(
  player: Pick<PlayerModel, (typeof restrictionField)[K]>,
  kind: K,
  now = new Date(),
): PlayerBan[] {
  const restrictions: PlayerBan[] | undefined = player[restrictionField[kind]]
  return (restrictions ?? []).filter(restriction => isActive(restriction, now))
}
