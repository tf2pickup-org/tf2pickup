import type { QueueSlotModel } from '../../../../database/models/queue-slot.model'

export function TeamPlayerCount(props: { teamIndex: number; slots: QueueSlotModel[] }) {
  return (
    <span id={`queue-team-player-count-${props.teamIndex.toString()}`}>
      {props.slots.filter(slot => slot.player).length}/{props.slots.length}
    </span>
  )
}
