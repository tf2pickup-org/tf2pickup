import { kickFromPools } from './kick-from-pools'
import { reset } from './reset'
import { readyUp } from './ready-up'
import { leave } from './leave'
import { teardown } from './teardown'
import { toggleRole } from './toggle-role'
import { toggleVolunteer } from './toggle-volunteer'

export const captainEngine = {
  kickFromPools,
  reset,
  readyUp,
  leave,
  teardown,
  toggleRole,
  toggleVolunteer,
} as const
