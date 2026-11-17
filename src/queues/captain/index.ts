import { kickFromPools } from './kick-from-pools'
import { reset } from './reset'
import { teardown } from './teardown'
import { toggleRole } from './toggle-role'
import { toggleVolunteer } from './toggle-volunteer'

export const captainEngine = {
  kickFromPools,
  reset,
  teardown,
  toggleRole,
  toggleVolunteer,
} as const
