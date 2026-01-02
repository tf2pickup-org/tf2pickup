import { collections } from '../../../database/collections'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { getMapVoteResults } from '../../get-map-vote-results'

export async function MapVote(props: { actor?: SteamId64 | undefined }) {
  const mapOptions = await collections.queueMapOptions.find().toArray()
  const results = await getMapVoteResults()

  return (
    <form
      class="grid grid-cols-1 gap-4 md:grid-cols-3"
      id="map-vote"
      ws-send
      data-disable-when-offline
    >
      {mapOptions.map(option => (
        <MapVoteButton results={results} map={option.name} actor={props.actor}></MapVoteButton>
      ))}
    </form>
  )
}

export function MapResult(props: { results: Record<string, number>; map: string }) {
  const totalVotes = Object.values(props.results).reduce((acc, votes) => acc + votes, 0)
  const mapVotes = props.results[props.map] ?? 0
  const votePercent = totalVotes === 0 ? 0 : Math.round((mapVotes / totalVotes) * 100)
  return <span id={`map-result-${props.map}`}>{votePercent}</span>
}

async function MapVoteButton(props: {
  results: Record<string, number>
  map: string
  actor?: SteamId64 | undefined
}) {
  return (
    <button
      class="map-vote-button text-white"
      name="votemap"
      value={props.map}
      sync-attr:disabled="#isInQueue.value === false"
      sync-attr:aria-checked={`#mapVoteSelection.value === ${props.map}`}
      aria-label={`Vote for map ${props.map}`}
      data-umami-event="vote-map"
      data-umami-event-map={props.map}
    >
      <div class="grow"></div>
      <div class="text-2xl leading-4 font-bold">
        <MapResult results={props.results} map={props.map} />%
      </div>
      <span class="text-2xl font-normal" safe>
        {props.map}
      </span>

      <div class="absolute top-0 right-0 bottom-0 left-1/3 -z-10">
        <MapThumbnail map={props.map} />
      </div>
    </button>
  )
}
