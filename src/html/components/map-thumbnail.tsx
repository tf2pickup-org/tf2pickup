import { environment } from '../../environment'

export function MapThumbnail(props: { map: string }) {
  const mapName = /^([a-z]+_[a-zA-Z0-9]+)/.exec(props.map)?.[0] ?? 'unknown'
  const thumbnailUrl = `${environment.THUMBNAIL_SERVICE_URL}/unsafe/300x169/${mapName}.jpg`

  return (
    <div
      class="map-thumbnail"
      data-map-thumbnail={mapName}
      style={`--map-thumbnail-url: url('${thumbnailUrl}'); --map-name: '${props.map}';`}
      role="img"
      aria-label={`${props.map} thumbnail`}
    />
  )
}
