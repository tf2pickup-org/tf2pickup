import type { Client } from '@tf2pickup-org/mumble-client'
import { configuration } from '../configuration'
import { logger } from '../logger'
import { assertClientIsConnected } from './assert-client-is-connected'
import { errors } from '../errors'
import { findTargetChannel } from './find-target-channel'

export async function moveToTargetChannel(c: Client | undefined) {
  assertClientIsConnected(c)
  const channel = await findTargetChannel(c)
  if (!channel) {
    const channelName = await configuration.get('games.voice_server.mumble.channel_name')
    throw errors.badRequest(`channel does not exist: ${channelName}`)
  }

  logger.trace({ channel: { id: channel.id, name: channel.name } }, 'mumble channel found')
  await c.self.moveToChannel(channel)
}
