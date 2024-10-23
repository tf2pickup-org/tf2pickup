import fp from 'fastify-plugin'
import { environment } from '../environment'
import { logger } from '../logger'
import { Cron } from 'croner'
import { getStreams } from './get-streams'
import { events } from '../events'
import { configuration } from '../configuration'
import { collections } from '../database/collections'

async function refreshStreams() {
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

export default fp(
  async () => {
    if (environment.TWITCH_CLIENT_ID === undefined) {
      logger.info('TWITCH_CLIENT_ID empty; twitch.tv integration is disabled')
      return
    }

    if (environment.TWITCH_CLIENT_SECRET === undefined) {
      logger.info('TWITCH_CLIENT_SECRET empty; twitch.tv integration is disabled')
      return
    }

    new Cron('* * * * *', async () => {
      try {
        await refreshStreams()
      } catch (error) {
        logger.error(error)
      }
    })

    logger.info('twitch.tv integration enabled')
  },
  {
    name: 'twitch-tv',
  },
)
