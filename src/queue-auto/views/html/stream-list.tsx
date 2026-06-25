import { collections } from '../../../database/collections'
import type { StreamModel } from '../../../database/models/stream.model'
import { IconEye } from '../../../html/components/icons'

const featuredCount = 3

export async function StreamList() {
  const streams = await collections.streams.find({}).sort({ viewerCount: -1 }).toArray()
  if (streams.length === 0) {
    return <div id="stream-list" class="hidden" />
  }

  const featured = streams.slice(0, featuredCount)
  const rest = streams.slice(featuredCount)

  return (
    <div class="flex flex-col gap-4" id="stream-list">
      <span class="text-[32px] font-bold text-white">Now streaming</span>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {featured.map(stream => (
          <FeaturedStream {...stream} />
        ))}
        {rest.length > 0 && (
          <div class="flex flex-col gap-2">
            {rest.map(stream => (
              <CompactStream {...stream} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FeaturedStream(props: StreamModel) {
  const thumbnail = props.thumbnailUrl.replace('{width}', '177').replace('{height}', '100')
  return (
    <a
      class="stream-link flex flex-row gap-6 rounded-lg p-2.5"
      href={`https://www.twitch.tv/${props.userName}`}
      target="_blank"
      rel="noreferrer"
    >
      <img src={thumbnail} alt="stream thumbnail" class="rounded-xs" width="177" height="100" />
      <div class="text-abru-light-75 flex flex-col justify-center font-medium">
        <span class="text-lg" safe>
          {props.userName}
        </span>
        <span class="flex flex-row items-end gap-1.5 text-sm">
          <IconEye size={18} />
          {props.viewerCount}
        </span>
      </div>
      <span class="tooltip" safe>
        {props.title}
      </span>
    </a>
  )
}

function CompactStream(props: StreamModel) {
  return (
    <a
      class="stream-link flex flex-row items-center justify-between gap-4 rounded-lg px-4 py-2.5"
      href={`https://www.twitch.tv/${props.userName}`}
      target="_blank"
      rel="noreferrer"
    >
      <span class="text-abru-light-75 truncate text-lg font-medium" safe>
        {props.userName}
      </span>
      <span class="text-abru-light-75 flex shrink-0 flex-row items-center gap-1.5 text-sm font-medium">
        <IconEye size={18} />
        {props.viewerCount}
      </span>
      <span class="tooltip" safe>
        {props.title}
      </span>
    </a>
  )
}
