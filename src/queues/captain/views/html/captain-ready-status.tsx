import { QueueState } from '../../../../database/models/queue-state.model'
import type { PoolView } from '../../types/pool-view'
import { PhaseTimer } from './phase-timer'

export function CaptainReadyStatus(props: { view: PoolView }) {
  const { state, readyPhase } = props.view
  return (
    <div id="captain-ready-status">
      {state === QueueState.ready && readyPhase && (
        <PhaseTimer startedAt={readyPhase.startedAt} deadline={readyPhase.deadline}>
          READY UP!
        </PhaseTimer>
      )}
    </div>
  )
}
