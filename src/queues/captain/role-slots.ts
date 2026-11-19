import { Tf2Team } from '../../shared/types/tf2-team'
import { roleKey } from './role-key'
import type { CaptainRole } from './types/captain-role'
import type { RoleSlot } from './types/role-slot'

export function roleSlots(roles: readonly CaptainRole[]): RoleSlot[] {
  return [Tf2Team.red, Tf2Team.blu].flatMap(team =>
    roles.map(role => ({ team, role: roleKey(role) })),
  )
}
