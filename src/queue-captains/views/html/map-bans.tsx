import type { DraftModel } from '../../../database/models/draft.model'
import { MapThumbnail } from '../../../html/components/map-thumbnail'
import { IconX } from '../../../html/components/icons'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import { banOrder } from '../../draft/ban-order'
import { remainingMaps } from '../../draft/remaining-maps'

export function MapBans(props: { draft: DraftModel; actor?: SteamId64 | undefined }) {
  const { draft } = props
  const team = banOrder(draft.mapOptions)[draft.mapBans.length]
  const isMyBan = team !== undefined && draft.captains[team] === props.actor
  const surviving = remainingMaps(draft)
  const decided = team === undefined || surviving.length <= 1

  return (
    <form class="map-bans" ws-send data-disable-when-offline>
      {draft.mapOptions.map(map => {
        const ban = draft.mapBans.find(entry => entry.map === map)
        const isMap = decided && surviving[0] === map

        if (ban) {
          return (
            <div class="map-ban" data-state="banned">
              <div class="map-ban-art">
                <MapThumbnail map={map} />
              </div>
              <span class="map-ban-x">
                <IconX size={48} />
              </span>
              <span class="map-ban-tag">
                banned by {ban.team}
                {ban.auto ? ' · timed out' : ''}
              </span>
              <span class="map-ban-name" safe>
                {map}
              </span>
            </div>
          )
        }

        const content = (
          <>
            <div class="map-ban-art">
              <MapThumbnail map={map} />
            </div>
            <span class="map-ban-tag">{isMap ? 'map' : isMyBan ? 'click to ban' : ''}</span>
            <span class="map-ban-name" safe>
              {map}
            </span>
          </>
        )

        return isMyBan ? (
          <button
            class="map-ban"
            data-state="open"
            data-team={team}
            name="captainsban"
            value={map}
            data-umami-event="captains-ban-map"
            data-umami-event-map={map}
          >
            {content}
          </button>
        ) : (
          <div class="map-ban" data-state={isMap ? 'won' : 'open'}>
            {content}
          </div>
        )
      })}
    </form>
  )
}

MapBans.heading = function (props: { draft: DraftModel; actor?: SteamId64 | undefined }) {
  const team = banOrder(props.draft.mapOptions)[props.draft.mapBans.length]
  if (team === undefined) {
    return <span class="turn-label">Map is set</span>
  }

  const isMyBan = props.draft.captains[team] === props.actor
  return (
    <>
      <span class="turn-team" data-team={team}>
        {team}
      </span>
      <span class="turn-label">{isMyBan ? 'Ban a map' : 'is banning'}</span>
      <span class="turn-sub">
        {props.draft.mapBans.length === 0
          ? 'first of two bans'
          : 'last ban — whatever is left is the map'}
      </span>
    </>
  )
}
