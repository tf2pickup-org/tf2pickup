import type { Channel } from '@tf2pickup-org/mumble-client'
import { configuration } from '../configuration'
import { logger } from '../logger'
import { assertClientIsConnected } from './assert-client-is-connected'
import { client } from './client'

export async function moveToTargetChannel() {
  assertClientIsConnected(client)
  let channel: Channel | undefined

  const channelName = await configuration.get('games.voice_server.mumble.channel_name')
  if (!channelName) {
    channel = client.channels.byId(0) // 0 is the root channel
  } else {
    channel = client.channels.byName(channelName)
  }

  if (!channel) {
    throw new Error(`channel does not exist: ${channelName}`)
  }

  logger.trace({ channel: { id: channel.id, name: channel.name } }, 'mumble channel found')
  await client.user!.moveToChannel(channel.id)
}
