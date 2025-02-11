import { requestContext } from '@fastify/request-context'
import { collections } from '../../../database/collections'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { getMapVoteResults } from '../../get-map-vote-results'

export async function MapVote(props: { actor?: SteamId64 | undefined }) {
  const mapOptions = await collections.queueMapOptions.find().toArray()
  const results = await getMapVoteResults()
  const boosted = requestContext.get('boosted')

  // Use morph swap only for partial updates
  const p = {
    ...(boosted ? {} : { 'hx-swap-oob': 'morph' }),
  }

  return (
    <form class="grid grid-cols-1 gap-4 md:grid-cols-3" id="map-vote" ws-send hx-ext="morph" {...p}>
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
  let mapVote: string | undefined = undefined
  let disabled = true

  if (props.actor) {
    mapVote = (await collections.queueMapVotes.findOne({ player: props.actor }))?.map
    const slotCount = await collections.queueSlots.countDocuments({ player: props.actor })
    disabled = slotCount === 0
  }

  const selected = mapVote === props.map

  return (
    <button
      class="map-vote-button text-white"
      disabled={disabled}
      name="votemap"
      value={props.map}
      aria-label={`Vote for map ${props.map}`}
      aria-checked={`${selected}`}
    >
      <div class="grow"></div>
      <div class="text-2xl font-bold leading-4">
        <MapResult results={props.results} map={props.map} />%
      </div>
      <span class="text-2xl font-normal" safe>
        {props.map}
      </span>

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
