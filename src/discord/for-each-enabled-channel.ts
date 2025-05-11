import { TextChannel, ChannelType } from 'discord.js'
import { configuration } from '../configuration'
import { logger } from '../logger'
import { assertClient } from './assert-client'
import { client } from './client'
import type { Configuration } from '../database/models/configuration-entry.model'

type GuildConfiguration = Configuration['discord.guilds'][number]

export async function forEachEnabledChannel<T extends Exclude<keyof GuildConfiguration, 'id'>>(
  channel: T,
  fn: (channel: TextChannel, config: NonNullable<GuildConfiguration[T]>) => Promise<void>,
) {
  const config = await configuration.get('discord.guilds')
  const enabledChannels = config
    .filter(guildConfiguration => Boolean(guildConfiguration[channel]?.channel))
    .map(guildConfig => guildConfig[channel]!)

  await Promise.all(
    enabledChannels.map(async channelConfig => {
      assertClient(client)
      const channel = client.channels.resolve(channelConfig.channel)
      if (!channel) {
        logger.error({ channelId: channelConfig.channel }, `no such channel`)
        return
      }

      if (channel.type !== ChannelType.GuildText) {
        logger.error({ channel: { id: channel.id, type: channel.type } }, `invalid channel type`)
        return
      }

      await fn(channel, channelConfig)
    }),
  )
}
