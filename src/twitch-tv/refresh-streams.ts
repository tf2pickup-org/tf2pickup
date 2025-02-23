import { configuration } from '../configuration'
import { collections } from '../database/collections'
import { events } from '../events'
import { getStreams } from './get-streams'

export async function refreshStreams() {
  const promotedStreams = await configuration.get('twitchtv.promoted_streams')
  const twitchStreams = await getStreams({
    userIds: [],
    userLogins: promotedStreams,
    type: 'live',
  })
  const streams = twitchStreams.map(stream => ({
    id: stream.id,
    userName: stream.user_name,
    title: stream.title,
    thumbnailUrl: stream.thumbnail_url,
    viewerCount: stream.viewer_count,
  }))
  await collections.streams.deleteMany({})
  if (streams.length > 0) {
    await collections.streams.insertMany(streams)
  }
  events.emit('twitch.tv/streams:updated', { streams })
}
