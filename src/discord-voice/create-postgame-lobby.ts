import { ChannelType, PermissionFlagsBits, type VoiceChannel } from 'discord.js'
import type { GameModel } from '../database/models/game.model'
import { discord } from '../discord'
import { assertClient } from '../discord/assert-client'
import { games } from '../games'
import { getGuild } from './get-guild'
import { resolveSlotMembers } from './sync-game-channels'

export async function createPostgameLobby(game: GameModel) {
  const guildContext = await getGuild()
  if (!guildContext || !game.discordVoice) {
    return game
  }

  assertClient(discord.client)
  const { guild, postgameCategory } = guildContext
  const resolvedExistingChannel = game.discordVoice.postgameChannelId
    ? guild.channels.resolve(game.discordVoice.postgameChannelId)
    : null
  const existingChannel: VoiceChannel | null =
    resolvedExistingChannel?.type === ChannelType.GuildVoice ? resolvedExistingChannel : null

  const postgameChannel: VoiceChannel =
    existingChannel ??
    (await guild.channels.create({
      name: `${game.number}-POSTGAME`,
      type: ChannelType.GuildVoice,
      parent: postgameCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
        },
        {
          id: discord.client.user!.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.Connect,
            PermissionFlagsBits.Speak,
            PermissionFlagsBits.MoveMembers,
            PermissionFlagsBits.ManageChannels,
          ],
        },
      ],
    }))

  const currentGame =
    existingChannel && game.discordVoice.postgameChannelId === postgameChannel.id
      ? game
      : await games.update(game.number, {
          $set: {
            'discordVoice.postgameChannelId': postgameChannel.id,
          },
        })

  const [redChannel, bluChannel] = [
    guild.channels.resolve(currentGame.discordVoice!.redChannelId),
    guild.channels.resolve(currentGame.discordVoice!.bluChannelId),
  ]
  if (redChannel?.type !== ChannelType.GuildVoice || bluChannel?.type !== ChannelType.GuildVoice) {
    return currentGame
  }

  const resolvedMembers = await resolveSlotMembers(currentGame)
  const members = [...redChannel.members.values(), ...bluChannel.members.values()]
  const overwriteIds = new Set([
    ...resolvedMembers.map(member => member.userId),
    ...members.map(member => member.id),
  ])

  await postgameChannel.permissionOverwrites.set([
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
    },
    {
      id: discord.client.user!.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ManageChannels,
      ],
    },
    ...Array.from(overwriteIds, id => ({
      id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
    })),
  ])

  await Promise.all(
    members.map(async member => {
      try {
        await member.voice.setChannel(postgameChannel)
      } catch {
        // ignore move failures; permission grant is already in place
      }
    }),
  )

  return currentGame
}
