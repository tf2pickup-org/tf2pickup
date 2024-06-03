import { environment } from '../../environment'

export function MapThumbnail(props: { map: string }) {
  const mapName = props.map.match(/^([a-z]+_[a-zA-Z0-9]+)/)?.[0] ?? 'unknown'
  const mapThumbnailUrl = (width: number, height: number) =>
    `${environment.THUMBNAIL_SERVICE_URL}/unsafe/${width}x${height}/${mapName}.jpg`

  return (
    <div class="flex h-full w-full items-center justify-center text-slate-700">
      <img
        loading="lazy"
        alt={`${props.map} thumbnail`}
        class="transition-opacity"
        src={mapThumbnailUrl(308, 200)}
      />
    </div>
  )
}
