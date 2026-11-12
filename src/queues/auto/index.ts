import { join } from './join'
import { kick } from './kick'
import { launchFailed } from './launch-failed'
import { leave } from './leave'
import { markAsFriend } from './mark-as-friend'
import { readyUp } from './ready-up'
import { recover } from './recover'
import { reset } from './reset'
import { teardown } from './teardown'
import { voteMap } from './vote-map'

export const queueEngine = {
  join,
  kick,
  launchFailed,
  leave,
  markAsFriend,
  readyUp,
  recover,
  reset,
  teardown,
  voteMap,
} as const
