import { collections } from '../../../../database/collections'
import type { QueueId } from '../../../../database/models/queue.model'
import { MapThumbnail } from '../../../../html/components/map-thumbnail'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { getMapVoteResults } from '../../get-map-vote-results'

export async function MapVote(props: { queue: QueueId; actor?: SteamId64 | undefined }) {
  const mapOptions = await collections.queueMapOptions.find({ queue: props.queue }).toArray()
  const results = await getMapVoteResults(props.queue)

  return (
    <form
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      id="map-vote"
      ws-send
      data-disable-when-offline
    >
      {mapOptions.map(option => (
        <MapVoteButton results={results} map={option.name} actor={props.actor}></MapVoteButton>
      ))}
      <div class="map-reroll-placeholder">
        <img class="map-reroll-art" src="/queue/reroll-background.svg" alt="" />
        <img class="map-reroll-dot" src="/queue/reroll-dot.svg" alt="" />
        <span class="map-reroll-caption">
          <span>Reroll maps</span>
          <span class="map-reroll-status">Unavailable</span>
        </span>
      </div>
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
      class="map-vote-button"
      name="votemap"
      value={props.map}
      sync-attr:disabled="#isInQueue.value === false"
      sync-attr:aria-checked={`#mapVoteSelection.value === ${props.map}`}
      aria-label={`Vote for map ${props.map}`}
      data-umami-event="vote-map"
      data-umami-event-map={props.map}
    >
      <div class="map-vote-thumbnail">
        <MapThumbnail map={props.map} />
      </div>
      <span class="map-vote-copy">
        <span class="map-vote-percent tabular-nums">
          <MapResult results={props.results} map={props.map} />%
        </span>
        <span class="map-vote-name" safe>
          {props.map}
        </span>
      </span>
    </button>
  )
}
