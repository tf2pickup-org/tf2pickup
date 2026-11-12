import { QueueState } from '../../database/models/queue-state.model'

export interface QueueCounts {
  players: number
  ready: number
  slots: number
}

export function decide(
  state: QueueState,
  { players, ready, slots }: QueueCounts,
): QueueState | null {
  switch (state) {
    case QueueState.waiting:
      return players === slots ? QueueState.ready : null
    case QueueState.ready:
      if (players === 0) {
        return QueueState.waiting
      }
      return ready === slots ? QueueState.launching : null
    case QueueState.launching:
      return null
  }
}
