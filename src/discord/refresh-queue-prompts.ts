import { EmbedBuilder, type Emoji } from 'discord.js'
import { retry } from 'es-toolkit'
import { configuration } from '../configuration'
import { collections } from '../database/collections'
import type { QueueModel } from '../database/models/queue.model'
import type { QueueSlotModel } from '../database/models/queue-slot.model'
import { environment } from '../environment'
import { gamemodeConfigs } from '../gamemodes/configs'
import { logger } from '../logger'
import { queues } from '../queues'
import { getMapVoteResults } from '../queues/auto/get-map-vote-results'
import { getSlots } from '../queues/auto/get-slots'
import type { Tf2ClassName } from '../shared/types/tf2-class-name'
import { assertClient } from './assert-client'
import { client } from './client'
import { forEachEnabledChannel } from './for-each-enabled-channel'
import { getMessage } from './get-message'
import { queuePromptMutex } from './queue-prompt-mutex'

const clientName = new URL(environment.WEBSITE_URL).hostname
const iconUrl = `${environment.WEBSITE_URL}/favicon.png`

// Each enabled queue has its own prompt; it is posted once enough players join and edited after.
export async function refreshQueuePrompts() {
  await queuePromptMutex.runExclusive(async () => {
    const enabled = await queues.listEnabled()
    for (const queue of enabled) {
      await refreshPrompt(queue, enabled.length > 1)
    }
  })
}

async function refreshPrompt(queue: QueueModel, named: boolean) {
  const key = queue._id.toHexString()
  const slots = await getSlots(queue._id)
  const playerCount = slots.filter(slot => !!slot.player).length
  const requiredPlayerCount = slots.length
  const mapVoteResults = await getMapVoteResults(queue._id)
  const config = await configuration.get('discord.guilds')

  await forEachEnabledChannel('queuePrompts', async channel => {
    const embed = queuePreview({
      title: `**${playerCount}/${requiredPlayerCount} players in the ${named ? `${queue.name} ` : ''}queue!**`,
      url: `${environment.WEBSITE_URL}${queues.queuePageUrl(queue.slug)}`,
      gameClassData: slotsToGameClassData(channel.guild.id, queue, slots),
      mapVoteResults,
    })

    const state = await collections.discordBotState.findOne({ guildId: channel.guild.id })
    const thresholdRatio = config.find(gc => gc.id === channel.guildId)!.queuePrompts!
      .bumpPlayerThresholdRatio

    await retry(
      async () => {
        const message = await getMessage(channel, state?.promptMessageIds?.[key])
        if (message) {
          await message.edit({ embeds: [embed] })
          return
        }

        if (playerCount >= requiredPlayerCount * thresholdRatio) {
          const sentMessage = await channel.send({ embeds: [embed] })
          await collections.discordBotState.updateOne(
            { guildId: channel.guild.id },
            { $set: { [`promptMessageIds.${key}`]: sentMessage.id } },
            { upsert: true },
          )
        }
      },
      { retries: 3 },
    )
  })
}

interface QueuePreviewGameClassData {
  gameClass: Tf2ClassName
  emoji?: Emoji | undefined
  players: { name: string }[]
  playersRequired: number
}

function queuePreview(options: {
  title: string
  url: string
  gameClassData: QueuePreviewGameClassData[]
  mapVoteResults: Record<string, number>
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor('#f9f9f9')
    .setTitle(options.title)
    .setDescription(`Join [${clientName}](${options.url}) to play the next game!`)
    .setThumbnail(iconUrl)
    .addFields([
      ...options.gameClassData.map(gameClassData => ({
        name: `${gameClassData.emoji?.toString()} ${gameClassData.gameClass} (${
          gameClassData.players.length
        }/${gameClassData.playersRequired})`,
        value:
          gameClassData.players.length > 0
            ? gameClassData.players.map(player => `\u25CF\u2000${player.name}`).join('\n')
            : '\u200B',
        inline: true,
      })),
      {
        name: 'map votes',
        value: Object.entries(options.mapVoteResults)
          .map(([mapName, count]) => `\u25CF\u2000${mapName}: ${count}`)
          .join('\n'),
        inline: false,
      },
    ])
    .setFooter({
      iconURL: iconUrl,
      text: clientName,
    })
    .setTimestamp()
}

function slotsToGameClassData(guildId: string, queue: QueueModel, slots: QueueSlotModel[]) {
  const playerData = slots
    .filter(slot => Boolean(slot.player))
    .map(slot => ({
      name: slot.player!.name,
      gameClass: slot.gameClass,
    }))

  const config = gamemodeConfigs[queue.gamemode]
  return config.classes.map(gameClass => {
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
      playersRequired: gameClass.count * config.teamCount,
      players: playerData.filter(p => p.gameClass === gameClass.name),
    }
  })
}
