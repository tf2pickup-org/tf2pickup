import type { MessagePayload, MessageCreateOptions } from 'discord.js'
import { configuration } from '../configuration'
import { assertClient } from './assert-client'
import { client } from './client'

export async function toAdmins(message: string | MessagePayload | MessageCreateOptions) {
  assertClient(client)
  const config = await configuration.get('discord.guilds')
  await Promise.allSettled(
    config
      .map(c => c.adminNotifications?.channel)
      .filter(Boolean)
      .map(channelId => channelId!)
      .map(async channelId => {
        const channel = client!.channels.resolve(channelId)
        if (!channel) {
          throw new Error(`channel ${channelId} could not be resolved`)
        }

        if (!channel.isSendable()) {
          throw new Error(`channel ${channel.name} is not sendable`)
        }

        await channel.send(message)
      }),
  )
}
