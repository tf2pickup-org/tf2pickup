import { environment } from '../../environment'

export function MapThumbnail(props: { map: string }) {
  const mapName = /^([a-z]+_[a-zA-Z0-9]+)/.exec(props.map)?.[0] ?? 'unknown'
  const mapThumbnailUrl = (width: number, height: number) =>
    `${environment.THUMBNAIL_SERVICE_URL}/unsafe/${width}x${height}/${mapName}.jpg`

  // Generate srcset with multiple image sizes for responsive loading
  // Browser will automatically select the most appropriate size based on container size
  const srcset = [
    `${mapThumbnailUrl(150, 84)} 150w`,
    `${mapThumbnailUrl(300, 169)} 300w`,
    `${mapThumbnailUrl(600, 338)} 600w`,
    `${mapThumbnailUrl(900, 506)} 900w`,
    `${mapThumbnailUrl(1200, 675)} 1200w`,
  ].join(', ')

  // sizes attribute describes expected display size to help browser select appropriate image
  const sizes = '(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw'

  return (
    <div class="map-thumbnail flex h-full w-full items-center justify-center text-slate-700">
      <img
        loading="lazy"
        alt={`${props.map} thumbnail`}
        class="h-full w-full object-cover"
        src={mapThumbnailUrl(300, 169)}
        srcset={srcset}
        // @ts-ignore - sizes is a valid HTML attribute but missing from @kitajs/html types
        sizes={sizes}
      />
    </div>
  )
}
