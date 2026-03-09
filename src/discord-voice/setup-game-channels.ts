import { ChannelType, PermissionFlagsBits } from 'discord.js'
import type { GameModel } from '../database/models/game.model'
import { errors } from '../errors'
import { discord } from '../discord'
import { assertClient } from '../discord/assert-client'
import { games } from '../games'
import { getGuild } from './get-guild'
import { syncGameChannels } from './sync-game-channels'

export async function setupGameChannels(game: GameModel) {
  const guildContext = await getGuild()
  if (!guildContext) {
    return game
  }

  assertClient(discord.client)
  const { guild, category, postgameCategory, config } = guildContext
  if (!discord.client.user) {
    throw errors.internalServerError('discord bot user unavailable')
  }

  const everyoneId = guild.roles.everyone.id
  const baseOverwrites = [
    {
      id: everyoneId,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
    },
    {
      id: discord.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ManageChannels,
      ],
    },
  ]

  const [redChannel, bluChannel] = await Promise.all([
    guild.channels.create({
      name: `${game.number}-RED`,
      type: ChannelType.GuildVoice,
      parent: category,
      permissionOverwrites: baseOverwrites,
    }),
    guild.channels.create({
      name: `${game.number}-BLU`,
      type: ChannelType.GuildVoice,
      parent: category,
      permissionOverwrites: baseOverwrites,
    }),
  ])

  const updatedGame = await games.update(game.number, {
    $set: {
      discordVoice: {
        guildId: config.guildId,
        categoryId: category.id,
        postgameCategoryId: postgameCategory.id,
        redChannelId: redChannel.id,
        bluChannelId: bluChannel.id,
      },
    },
  })

  return await syncGameChannels(updatedGame)
}
