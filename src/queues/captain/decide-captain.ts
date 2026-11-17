import { QueueState } from '../../database/models/queue-state.model'

// Never produces drafting, banningMaps or launching: a draft is entered and left by its own
// commands, and sign-ups during one never trigger a ready-up (SPEC 4.4a).
export function decideCaptain(state: QueueState, { full }: { full: boolean }): QueueState | null {
  switch (state) {
    case QueueState.waiting:
      return full ? QueueState.ready : null
    case QueueState.ready:
      return full ? null : QueueState.waiting
    case QueueState.launching:
    case QueueState.drafting:
    case QueueState.banningMaps:
      return null
  }
}
