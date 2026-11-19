import { QueueState } from '../../../../database/models/queue-state.model'
import { MapThumbnail } from '../../../../html/components/map-thumbnail'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'
import { banTurn } from '../../ban-turn'
import type { PoolView } from '../../types/pool-view'

export function CaptainMapBans(props: { view: PoolView; viewer?: SteamId64 | undefined }) {
  const view = props.view.draft
  if (!view || props.view.state === QueueState.drafting) return <div id="captain-map-bans"></div>
  const { draft } = view
  const turn = banTurn(draft)
  const final = turn.remaining.length === 1
  const onClock = props.view.state === QueueState.banningMaps && props.viewer === draft[turn.team]
  const captain =
    view.members.find(member => member.player.steamId === draft[turn.team])?.player.name ??
    draft[turn.team]
  return (
    <section id="captain-map-bans" class="flex flex-col gap-4 max-lg:order-2">
      <h2 class="text-2xl font-bold text-zinc-50" safe>
        {final
          ? `Heading to ${turn.remaining[0]}`
          : onClock
            ? 'Your ban'
            : `${captain} bans map ${turn.index + 1}`}
      </h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {draft.mapOptions.map(map => {
          const banned = draft.bans.some(ban => ban.map === map)
          const classes = [
            'map-vote-button h-[180px] p-4 border-zinc-700',
            banned && 'bg-zinc-900 text-zinc-400 before:bg-none',
            onClock && !banned && 'cursor-pointer hover:border-2 hover:border-zinc-300',
          ]
          const content = (
            <>
              <div class={['map-vote-thumbnail', banned && 'opacity-50 grayscale']}>
                <MapThumbnail map={map} />
              </div>
              {banned || final ? (
                <span
                  class={[
                    'absolute top-4 left-4 z-2 rounded px-4 py-1 text-sm font-bold uppercase',
                    banned ? 'bg-zinc-600 text-zinc-200' : 'bg-map-heading text-zinc-100',
                  ]}
                >
                  {banned ? 'Banned' : 'Heading to...'}
                </span>
              ) : (
                <></>
              )}
              <span class="map-vote-copy">
                <span class={['map-vote-name', banned ? 'text-zinc-400' : 'text-zinc-200']} safe>
                  {map}
                </span>
              </span>
            </>
          )
          return onClock && !banned ? (
            <button
              type="button"
              class={classes}
              name="banmap"
              value={map}
              ws-send
              hx-trigger="click"
              hx-vals={JSON.stringify({ banmap: map })}
              aria-label={`Ban ${map}`}
              data-pick-button
              data-umami-event="captain-ban"
            >
              {content}
            </button>
          ) : (
            <div class={classes} data-map={map} data-banned={banned ? '' : undefined}>
              {content}
            </div>
          )
        })}
      </div>
    </section>
  )
}
