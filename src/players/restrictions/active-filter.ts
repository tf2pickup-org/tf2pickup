import type { Filter } from 'mongodb'
import type { PlayerModel } from '../../database/models/player.model'
import { restrictionField } from './restriction-field'
import type { RestrictionKind } from './restriction-kind'

export function activeFilter(kind: RestrictionKind, now = new Date()): Filter<PlayerModel> {
  return { [`${restrictionField[kind]}.end`]: { $gt: now } }
}
