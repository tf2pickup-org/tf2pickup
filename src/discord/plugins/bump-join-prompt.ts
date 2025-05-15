import fp from 'fastify-plugin'
import { forEachEnabledChannel } from '../for-each-enabled-channel'
import { collections } from '../../database/collections'
import { getMessage } from '../get-message'
import { minutesToMilliseconds } from 'date-fns'
import { queue } from '../../queue'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app.addHook('onReady', async () => {
    setInterval(ensurePromptIsVisible, minutesToMilliseconds(5))
    await ensurePromptIsVisible()
  })
})

async function ensurePromptIsVisible() {
  await forEachEnabledChannel('queuePrompts', async (channel, config) => {
    const state = await collections.discordBotState.findOne({ guildId: channel.guild.id })
    const message = await getMessage(channel, state?.promptMessageId)
    if (!message) {
      return
    }

    const messages = await channel.messages.fetch({ limit: 1 })
    if (messages.size === 0) {
      return
    }

    if (message.id === messages.first()!.id) {
      return
    }

    const thresholdRatio = config.bumpPlayerThresholdRatio
    const slots = await queue.getSlots()
    const playerCount = slots.filter(slot => !!slot.player).length
    const requiredPlayerCount = slots.length

    if (playerCount < requiredPlayerCount * thresholdRatio) {
      return
    }

    const embeds = message.embeds
    const content = message.content
    await message.delete()

    const sentMessage = await channel.send({
      content,
      embeds,
    })
    await collections.discordBotState.updateOne(
      { guildId: channel.guild.id },
      { $set: { promptMessageId: sentMessage.id } },
    )
  })
}
