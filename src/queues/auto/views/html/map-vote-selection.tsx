import type { QueueId } from '../../../../database/models/queue.model'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { getMapVote } from '../../get-map-vote'

export async function MapVoteSelection(props: { queue: QueueId; actor?: SteamId64 | undefined }) {
  const mapVote = await getMapVote(props.queue, props.actor)
  return <input type="hidden" id="mapVoteSelection" value={mapVote} />
}
