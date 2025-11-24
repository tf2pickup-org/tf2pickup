import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { getMapVote } from '../../get-map-vote'

export async function MapVoteSelection(props: { actor?: SteamId64 | undefined }) {
  const mapVote = await getMapVote(props.actor)
  return <input type="hidden" id="mapVoteSelection" value={mapVote} />
}
