import {
  ChannelType,
  PermissionFlagsBits,
  type GuildMember,
  type OverwriteResolvable,
} from 'discord.js'
import type { GameModel } from '../database/models/game.model'
import { Tf2Team } from '../shared/types/tf2-team'
import { discord } from '../discord'
import { assertClient } from '../discord/assert-client'
import { collections } from '../database/collections'
import { games } from '../games'
import { makeDeepLink } from './deep-link'
import { getGuild } from './get-guild'

interface ResolvedSlotMember {
  steamId: GameModel['slots'][number]['player']
  userId: string
  channelId: string
  member: GuildMember
}

export async function resolveSlotMembers(game: GameModel) {
  const guildContext = await getGuild()
  if (!guildContext || !game.discordVoice) {
    return []
  }

  const { guild } = guildContext
  const players = await Promise.all(
    game.slots.map(async slot => {
      const player = await collections.players.findOne(
        { steamId: slot.player },
        { projection: { steamId: 1, discordProfile: 1 } },
      )
      return { slot, player }
    }),
  )

  const resolved = await Promise.all(
    players.map(async ({ slot, player }) => {
      const userId = player?.discordProfile?.userId
      if (!userId) {
        return null
      }

      try {
        const member = await guild.members.fetch(userId)
        const channelId =
          slot.team === Tf2Team.red
            ? game.discordVoice!.redChannelId
            : game.discordVoice!.bluChannelId
        return { steamId: slot.player, userId, channelId, member } satisfies ResolvedSlotMember
      } catch {
        return null
      }
    }),
  )

  return resolved.filter(member => member !== null)
}

function makeChannelOverwrites(
  everyoneId: string,
  channelMembers: ResolvedSlotMember[],
): OverwriteResolvable[] {
  assertClient(discord.client)

  return [
    {
      id: everyoneId,
      deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
    },
    {
      id: discord.client.user!.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.MoveMembers,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.Speak,
      ],
    },
    ...channelMembers.map(({ userId }) => ({
      id: userId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
    })),
  ].filter(overwrite => overwrite.id)
}

export async function syncGameChannels(game: GameModel) {
  const guildContext = await getGuild()
  if (!guildContext || !game.discordVoice) {
    return game
  }

  const { guild } = guildContext
  const [redChannel, bluChannel] = [
    guild.channels.resolve(game.discordVoice.redChannelId),
    guild.channels.resolve(game.discordVoice.bluChannelId),
  ]
  if (redChannel?.type !== ChannelType.GuildVoice || bluChannel?.type !== ChannelType.GuildVoice) {
    return game
  }

  const resolvedMembers = await resolveSlotMembers(game)
  const redMembers = resolvedMembers.filter(({ channelId }) => channelId === redChannel.id)
  const bluMembers = resolvedMembers.filter(({ channelId }) => channelId === bluChannel.id)

  await Promise.all([
    redChannel.permissionOverwrites.set(makeChannelOverwrites(guild.roles.everyone.id, redMembers)),
    bluChannel.permissionOverwrites.set(makeChannelOverwrites(guild.roles.everyone.id, bluMembers)),
  ])

  const setDoc: Record<string, string> = {}
  const unsetDoc: Record<string, 1> = {}

  for (const [i, slot] of game.slots.entries()) {
    const matchingMember = resolvedMembers.find(member => member.steamId === slot.player)
    if (!matchingMember) {
      unsetDoc[`slots.${i}.voiceServerUrl`] = 1
      continue
    }

    setDoc[`slots.${i}.voiceServerUrl`] = makeDeepLink(
      game.discordVoice.guildId,
      matchingMember.channelId,
    )
  }

  const updateDoc: { $set?: Record<string, string>; $unset?: Record<string, 1> } = {}
  if (Object.keys(setDoc).length > 0) {
    updateDoc.$set = setDoc
  }
  if (Object.keys(unsetDoc).length > 0) {
    updateDoc.$unset = unsetDoc
  }

  if (Object.keys(updateDoc).length === 0) {
    return game
  }

  return await games.update(game.number, updateDoc)
}
