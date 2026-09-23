import type { Gamemode } from '../../../shared/types/gamemode'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { getMapVote } from '../../get-map-vote'

export async function MapVoteSelection(props: {
  gamemode: Gamemode
  actor?: SteamId64 | undefined
}) {
  const mapVote = await getMapVote(props.gamemode, props.actor)
  return <input type="hidden" id="mapVoteSelection" value={mapVote} />
}
