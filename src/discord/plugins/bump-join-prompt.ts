import fp from 'fastify-plugin'
import { forEachEnabledChannel } from '../for-each-enabled-channel'
import { collections } from '../../database/collections'
import { getMessage } from '../get-message'
import { minutesToMilliseconds } from 'date-fns'

export default fp(async () => {
  await ensurePromptIsVisible()
  setInterval(ensurePromptIsVisible, minutesToMilliseconds(5))
})

async function ensurePromptIsVisible() {
  await forEachEnabledChannel('queuePrompts', async channel => {
    const state = await collections.discordBotState.findOne({ guildId: channel.guild.id })
    const message = await getMessage(channel, state?.promptMessageId)
    if (!message) {
      return
    }

    const messages = await channel.messages.fetch({ limit: 1 })
    if (messages.size === 0) {
      return
    }

    if (message.id !== messages.first()!.id) {
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
    }
  })
}
