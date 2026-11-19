import { QueueState } from '../../database/models/queue-state.model'

// Sign-ups during a running draft never trigger ready-up (SPEC 4.4a).
export function decideCaptain(
  state: QueueState,
  { full, allReady = false }: { full: boolean; allReady?: boolean },
): QueueState.waiting | QueueState.ready | QueueState.drafting | null {
  switch (state) {
    case QueueState.waiting:
      return full ? QueueState.ready : null
    case QueueState.ready:
      return !full ? QueueState.waiting : allReady ? QueueState.drafting : null
    case QueueState.launching:
    case QueueState.drafting:
    case QueueState.banningMaps:
      return null
  }
}
