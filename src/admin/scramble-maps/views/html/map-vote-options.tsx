import { collections } from '../../../../database/collections'
import { MapThumbnail } from '../../../../html/components/map-thumbnail'

export async function MapVoteOptions() {
  const mapOptions = await collections.queueMapOptions.find().toArray()

  return (
    <div class="grid grid-cols-3 gap-x-4 gap-y-2" id="adminPanelMapVoteOptions">
      {mapOptions.map(({ name }) => (
        <MapThumbnail map={name} />
      ))}

      {mapOptions.map(({ name }) => (
        <p class="text-center" safe>
          {name}
        </p>
      ))}
    </div>
  )
}
