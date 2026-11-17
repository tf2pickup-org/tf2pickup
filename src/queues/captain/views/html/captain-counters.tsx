import { QueueState } from '../../../../database/models/queue-state.model'
import { captainRoles } from '../../captain-roles'
import type { PoolView } from '../../pool-view'
import type { QueueModel } from '../../../../database/models/queue.model'

export function CaptainCounters(props: { queue: Pick<QueueModel, 'gamemode'>; view: PoolView }) {
  const { readiness, state } = props.view
  const roleCount = captainRoles(props.queue.gamemode).length
  const nextGame = state === QueueState.drafting || state === QueueState.banningMaps

  return (
    <h1 id="captain-counters" class="queue-player-count flex gap-4">
      {nextGame && <span class="font-normal text-zinc-400">Next game:</span>}
      <span>
        Players {readiness.players}/{readiness.requiredPlayers}
      </span>
      <span>
        Roles {readiness.coveredRoles}/{roleCount}
      </span>
      <span>Captains {readiness.volunteers}/2</span>
    </h1>
  )
}
