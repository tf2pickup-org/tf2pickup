import { ChannelType, type CategoryChannel, type Guild } from 'discord.js'
import { errors } from '../errors'
import { discord } from '../discord'
import { assertClient } from '../discord/assert-client'
import { getConfig } from './get-config'

export async function getGuild() {
  const config = await getConfig()
  if (!config) {
    return null
  }

  assertClient(discord.client)
  const guild = discord.client.guilds.resolve(config.guildId)
  if (!guild) {
    throw errors.notFound(`discord guild not found`)
  }

  const category = guild.channels.resolve(config.categoryId)
  if (category?.type !== ChannelType.GuildCategory) {
    throw errors.notFound(`discord voice category not found`)
  }

  const postgameCategory = guild.channels.resolve(config.postgameCategoryId)
  if (postgameCategory?.type !== ChannelType.GuildCategory) {
    throw errors.notFound(`discord postgame category not found`)
  }

  return {
    guild,
    config,
    category,
    postgameCategory,
  } satisfies {
    guild: Guild
    config: NonNullable<Awaited<ReturnType<typeof getConfig>>>
    category: CategoryChannel
    postgameCategory: CategoryChannel
  }
}
