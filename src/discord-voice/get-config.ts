import { errors } from '../errors'
import { configuration } from '../configuration'
import { VoiceServerType } from '../shared/types/voice-server-type'

export interface DiscordVoiceConfiguration {
  guildId: string
  categoryId: string
  postgameCategoryId: string
}

export async function getConfig(): Promise<DiscordVoiceConfiguration | null> {
  const type = await configuration.get('games.voice_server_type')
  if (type !== VoiceServerType.discord) {
    return null
  }

  const [guildId, categoryId, postgameCategoryId] = await Promise.all([
    configuration.get('games.voice_server.discord.guild_id'),
    configuration.get('games.voice_server.discord.category_id'),
    configuration.get('games.voice_server.discord.postgame_category_id'),
  ])

  if (!guildId || !categoryId || !postgameCategoryId) {
    throw errors.internalServerError('discord voice configuration malformed')
  }

  return { guildId, categoryId, postgameCategoryId }
}
