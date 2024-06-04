import { environment } from '../../environment'

export function MapThumbnail(props: { map: string }) {
  const mapName = props.map.match(/^([a-z]+_[a-zA-Z0-9]+)/)?.[0] ?? 'unknown'
  const mapThumbnailUrl = (width: number, height: number) =>
    `${environment.THUMBNAIL_SERVICE_URL}/unsafe/${width}x${height}/${mapName}.jpg`

  return (
    <div
      class="flex h-full w-full items-center justify-center text-slate-700 map-thumbnail"
      data-map-name={mapName}
      data-map-url-template={`${environment.THUMBNAIL_SERVICE_URL}/unsafe/{width}x{height}/{map}.jpg`}
      // TODO replace with a proper observer
      _="init js(me) addThumbnailObserver(me)"
    >
      <img
        loading="lazy"
        alt={`${props.map} thumbnail`}
        class="transition-opacity"
        src={mapThumbnailUrl(300, 169)}
      />
    </div>
  )
}
