import type { Channel, Client } from '@tf2pickup-org/mumble-client'
import { configuration } from '../configuration'
import { logger } from '../logger'
import { assertClientIsConnected } from './assert-client-is-connected'
import { errors } from '../errors'

export async function moveToTargetChannel(c: Client | undefined) {
  assertClientIsConnected(c)
  let channel: Channel | undefined

  const channelName = await configuration.get('games.voice_server.mumble.channel_name')
  if (!channelName) {
    channel = c.channels.byId(0) // 0 is the root channel
  } else {
    channel = c.channels.byName(channelName)
  }

  if (!channel) {
    throw errors.badRequest(`channel does not exist: ${channelName}`)
  }

  logger.trace({ channel: { id: channel.id, name: channel.name } }, 'mumble channel found')
  await c.user.moveToChannel(channel.id)
}
