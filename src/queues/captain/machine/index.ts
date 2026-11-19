import { advanceDraft } from './advance-draft'
import { recordLast } from './record-last'
import { recover } from './recover'
import { reset } from './reset'
import { step } from './step'
import { teardown } from './teardown'
import { toWaiting } from './to-waiting'

// The captain queue's state machine: the only writer of its queueState and captainDrafts, its
// timers and its legal picks cache. All but recover, reset and teardown run inside queueCommand().
export const captainMachine = {
  advanceDraft,
  recordLast,
  recover,
  reset,
  step,
  teardown,
  toWaiting,
} as const
