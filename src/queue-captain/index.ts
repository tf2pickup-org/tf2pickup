import { banMap } from './ban-map'
import { canFormTeams } from './can-form-teams'
import { getPlayers } from './get-players'
import { isEligibleCaptain } from './is-eligible-captain'
import { join } from './join'
import { kick } from './kick'
import { leave } from './leave'
import { pick } from './pick'
import { readyUp } from './ready-up'
import { reset } from './reset'
import { selectCaptains } from './select-captains'
import { unready } from './unready'

export const queueCaptain = {
  banMap,
  canFormTeams,
  getPlayers,
  isEligibleCaptain,
  join,
  kick,
  leave,
  pick,
  readyUp,
  reset,
  selectCaptains,
  unready,
} as const
