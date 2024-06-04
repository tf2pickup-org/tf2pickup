import { collections } from '../../../database/collections'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { getMapVoteResults } from '../../get-map-vote-results'

export async function MapVote(props: { actor?: SteamId64 | undefined }) {
  const mapOptions = await collections.queueMapOptions.find().toArray()
  return (
    <form class="grid gap-4 grid-cols-3" id="map-vote" ws-send>
      {mapOptions.map(option => (
        <MapVoteButton map={option.name} actor={props.actor}></MapVoteButton>
      ))}
    </form>
  )
}

async function MapVoteButton(props: { map: string; actor?: SteamId64 | undefined }) {
  let mapVote: string | undefined = undefined
  let disabled = true

  if (props.actor) {
    mapVote = (await collections.queueMapVotes.findOne({ player: props.actor }))?.map
    const slotCount = await collections.queueSlots.countDocuments({ player: props.actor })
    disabled = slotCount === 0
  }

  const selected = mapVote === props.map

  const results = await getMapVoteResults()
  const totalVotes = Object.values(results).reduce((acc, votes) => acc + votes, 0)
  const mapVotes = results[props.map] ?? 0
  const votePercent = totalVotes === 0 ? 0 : Math.round((mapVotes / totalVotes) * 100)

  return (
    <button class="map-vote-button text-white" disabled={disabled} name="votemap" value={props.map}>
      <div class="grow"></div>
      <span class="text-2xl font-bold leading-4">{votePercent}%</span>
      <span class="text-2xl font-normal">{props.map}</span>

      <div class="absolute bottom-0 left-1/3 right-0 top-0 -z-10">
        <MapThumbnail map={props.map} />
      </div>

      {selected ? (
        <div class="absolute bottom-0 left-0 right-0 top-0 z-10 rounded-lg border-4 border-white"></div>
      ) : (
        <></>
      )}
    </button>
  )
}
