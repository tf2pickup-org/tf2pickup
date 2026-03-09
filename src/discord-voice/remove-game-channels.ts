import { ChannelType, type VoiceChannel } from 'discord.js'
import type { GameModel } from '../database/models/game.model'
import { logger } from '../logger'
import { games } from '../games'
import { getGuild } from './get-guild'

export async function removeGameChannels(game: GameModel) {
  const guildContext = await getGuild()
  if (!guildContext || !game.discordVoice) {
    return { removed: true }
  }

  const { guild } = guildContext
  const channels = [
    guild.channels.resolve(game.discordVoice.redChannelId),
    guild.channels.resolve(game.discordVoice.bluChannelId),
    game.discordVoice.postgameChannelId
      ? guild.channels.resolve(game.discordVoice.postgameChannelId)
      : null,
  ].filter((channel): channel is VoiceChannel => channel?.type === ChannelType.GuildVoice)

  const occupied = channels.some(channel => channel.members.size > 0)
  if (occupied) {
    logger.debug({ gameNumber: game.number }, 'discord voice channels not empty yet')
    return { removed: false }
  }

  await Promise.all(channels.map(async channel => await channel.delete()))
  await games.update(game.number, {
    $unset: {
      discordVoice: 1,
      ...Object.fromEntries(game.slots.map((_, i) => [`slots.${i}.voiceServerUrl`, 1])),
    },
  })
  logger.info({ gameNumber: game.number }, 'discord voice channels removed')
  return { removed: true }
}
