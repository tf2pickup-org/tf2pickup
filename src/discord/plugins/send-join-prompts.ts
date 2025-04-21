import { secondsToMilliseconds } from 'date-fns'
import { debounce } from 'es-toolkit'
import fp from 'fastify-plugin'
import { events } from '../../events'
import { queue } from '../../queue'
import { environment } from '../../environment'
import {
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  TextChannel,
  type Emoji,
  type TextBasedChannel,
} from 'discord.js'
import { configuration } from '../../configuration'
import { client } from '../client'
import { assertClient } from '../assert-client'
import { logger } from '../../logger'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { QueueSlotModel } from '../../database/models/queue-slot.model'
import { players } from '../../players'
import { collections } from '../../database/collections'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async () => {
  events.on('queue/slots:updated', debounce(refreshPrompt, secondsToMilliseconds(3)))
})

const clientName = new URL(environment.WEBSITE_URL).hostname
const iconUrl = `${environment.WEBSITE_URL}/favicon.png`

interface QueuePreviewGameClassData {
  gameClass: Tf2ClassName
  emoji?: Emoji | undefined
  players: { name: string }[]
  playersRequired: number
}

async function refreshPrompt() {
  const slots = await queue.getSlots()
  const playerCount = slots.filter(slot => !!slot.player).length
  const requiredPlayerCount = slots.length
  await forEachEnabledChannel(async channel => {
    const embed = queuePreview({
      playerCount,
      requiredPlayerCount,
      gameClassData: await slotsToGameClassData(channel.guild.id, slots),
    })

    const state = await collections.discordBotState.findOne({ guildId: channel.guild.id })
    const message = await getMessage(channel, state?.promptMessageId)
    if (message) {
      await message.edit({ embeds: [embed] })
      return
    }

    const config = await configuration.get('discord.guilds')
    const thresholdRatio = config.find(gc => gc.id === channel.guildId)!.queuePrompts!
      .bumpPlayerThresholdRatio

    if (playerCount >= requiredPlayerCount * thresholdRatio) {
      const sentMessage = await channel.send({ embeds: [embed] })
      await collections.discordBotState.updateOne(
        { guildId: channel.guild.id },
        { $set: { promptMessageId: sentMessage.id } },
        { upsert: true },
      )
    }
  })
}

interface QueuePreviewOptions {
  playerCount: number
  requiredPlayerCount: number
  gameClassData: QueuePreviewGameClassData[]
}

function queuePreview(options: QueuePreviewOptions): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#f9f9f9')
    .setTitle(`**${options.playerCount}/${options.requiredPlayerCount} players in the queue!**`)
    .setDescription(`Join [${clientName}](${environment.WEBSITE_URL}) to play the next game!`)
    .setThumbnail(iconUrl)
    .addFields(
      options.gameClassData.map(gameClassData => ({
        name: `${gameClassData.emoji?.toString()} ${gameClassData.gameClass} (${
          gameClassData.players.length
        }/${gameClassData.playersRequired})`,
        value:
          gameClassData.players.length > 0
            ? gameClassData.players.map(player => `\u25CF\u2000${player.name}`).join('\n')
            : '\u200B',
        inline: true,
      })),
    )
    .setFooter({
      iconURL: iconUrl,
      text: clientName,
    })
    .setTimestamp()
}

async function forEachEnabledChannel(fn: (channel: TextChannel) => Promise<void>) {
  const config = await configuration.get('discord.guilds')
  const enabledChannels = config
    .filter(guildConfiguration => Boolean(guildConfiguration.queuePrompts?.channel))
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

async function slotsToGameClassData(guildId: string, slots: QueueSlotModel[]) {
  const playerData = await Promise.all(
    slots
      .filter(slot => Boolean(slot.player))
      .map(async slot => {
        const player = await players.bySteamId(slot.player!)
        return {
          name: player.name,
          gameClass: slot.gameClass,
        }
      }),
  )

  return queue.config.classes.map(gameClass => {
    assertClient(client)
    const emojiName = `tf2${gameClass.name}`
    const guild = client.guilds.cache.get(guildId)
    const emoji = guild?.emojis.cache.find(emoji => emoji.name === emojiName)

    if (!emoji) {
      logger.warn({ emojiName, guildId }, `emoji not found`)
    }

    return {
      gameClass: gameClass.name,
      emoji,
      playersRequired: gameClass.count * queue.config.teamCount,
      players: playerData.filter(p => p.gameClass === gameClass.name),
    }
  })
}

async function getMessage(channel: TextBasedChannel, messageId?: string) {
  if (messageId) {
    try {
      return await channel.messages.fetch(messageId)
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        return undefined
      }

      throw error
    }
  } else {
    return undefined
  }
}
