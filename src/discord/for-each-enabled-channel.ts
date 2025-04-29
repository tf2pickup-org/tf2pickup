import { TextChannel, ChannelType } from 'discord.js'
import { configuration } from '../configuration'
import { logger } from '../logger'
import { assertClient } from './assert-client'
import { client } from './client'

export async function forEachEnabledChannel(
  channel: 'substituteNotifications' | 'queuePrompts' | 'adminNotifications',
  fn: (channel: TextChannel) => Promise<void>,
) {
  const config = await configuration.get('discord.guilds')
  const enabledChannels = config
    .filter(guildConfiguration => Boolean(guildConfiguration[channel]?.channel))
    .map(guildConfig => guildConfig.queuePrompts!.channel)

  await Promise.all(
    enabledChannels.map(async channelId => {
      assertClient(client)
      const channel = client.channels.resolve(channelId)
      if (!channel) {
        logger.error({ channelId }, `no such channel`)
        return
      }

      if (channel.type !== ChannelType.GuildText) {
        logger.error({ channel: { id: channel.id, type: channel.type } }, `invalid channel type`)
        return
      }

      await fn(channel)
    }),
  )
}
