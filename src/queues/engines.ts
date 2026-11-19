import type { QueueId, QueueModel } from '../database/models/queue.model'
import type { Emit } from './queue-command'
import { reset as autoReset } from './auto/reset'
import { step as autoStep } from './auto/step'
import { teardown as autoTeardown } from './auto/teardown'
import { reset as captainReset } from './captain/reset'
import { step as captainStep } from './captain/step'
import { teardown as captainTeardown } from './captain/teardown'

interface Engine {
  // one transition of the queue's state machine; true if one applied. Runs inside queueCommand().
  step: (queue: QueueModel, emit: Emit) => Promise<boolean>
  // fresh runtime state for a queue that was just enabled
  reset: (queue: QueueId) => Promise<void>
  // drops the players and runtime state of a queue that was just disabled
  teardown: (queue: QueueId) => Promise<void>
}

// What differs between launch modes for operations addressed by queue. Operations addressed by
// player (kick, removePlayer, membership) reach every engine instead: a player is in at most one queue.
export const engines: Record<QueueModel['launchMode'], Engine> = {
  auto: {
    step: autoStep,
    reset: autoReset,
    teardown: autoTeardown,
  },
  captain: {
    step: captainStep,
    reset: captainReset,
    teardown: captainTeardown,
  },
}
