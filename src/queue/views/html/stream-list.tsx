import { collections } from '../../../database/collections'
import type { StreamModel } from '../../../database/models/stream.model'
import { IconEye } from '../../../html/components/icons'

export async function StreamList() {
  const streams = await collections.streams.find({}).toArray()
  if (streams.length === 0) {
    return <div id="stream-list" class="hidden" />
  }

  return (
    <div
      class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      id="stream-list"
    >
      <span class="text-[32px] font-bold text-white md:col-span-2 lg:col-span-3 xl:col-span-4">
        Now streaming
      </span>
      {streams.map(stream => (
        <Stream {...stream} />
      ))}
    </div>
  )
}

async function Stream(props: StreamModel) {
  const thumbnail = props.thumbnailUrl.replace('{width}', '177').replace('{height}', '100')
  return (
    <a
      class="stream-link flex flex-row gap-6 rounded-lg p-2.5"
      href={`https://www.twitch.tv/${props.userName}`}
      target="_blank"
      rel="noreferrer"
    >
      <img src={thumbnail} alt="stream thumbnail" class="rounded-sm" width="177" height="100" />
      <div class="flex flex-col justify-center font-medium text-abru-light-75">
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
