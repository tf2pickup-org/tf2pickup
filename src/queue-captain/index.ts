import { addOfferedClass } from './add-offered-class'
import { banMap } from './ban-map'
import { canFormTeams } from './can-form-teams'
import { getPlayers } from './get-players'
import { isEligibleCaptain } from './is-eligible-captain'
import { join } from './join'
import { kick } from './kick'
import { leave } from './leave'
import { pick } from './pick'
import { readyUp } from './ready-up'
import { removeOfferedClass } from './remove-offered-class'
import { reset } from './reset'
import { selectCaptains } from './select-captains'
import { setWantsCaptain } from './set-wants-captain'
import { unready } from './unready'

export const queueCaptain = {
  addOfferedClass,
  banMap,
  canFormTeams,
  getPlayers,
  isEligibleCaptain,
  join,
  kick,
  leave,
  pick,
  readyUp,
  removeOfferedClass,
  reset,
  selectCaptains,
  setWantsCaptain,
  unready,
} as const
