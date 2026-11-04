import type { Client } from '@tf2pickup-org/mumble-client'
import { configuration } from '../configuration'

export async function findTargetChannel(c: Client) {
  const channelName = await configuration.get('games.voice_server.mumble.channel_name')
  return channelName ? c.channels.byName(channelName) : c.channels.byId(0) // 0 is the root channel
}
