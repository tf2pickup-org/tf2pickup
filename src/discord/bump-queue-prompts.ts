import { collections } from '../database/collections'
import { queues } from '../queues'
import { getSlots } from '../queues/auto/get-slots'
import { forEachEnabledChannel } from './for-each-enabled-channel'
import { getMessage } from './get-message'
import { queuePromptMutex } from './queue-prompt-mutex'

// Re-posts queue prompts that other messages pushed up the channel. With several queues, the
// prompts that are due share the bottom of the channel, so they don't keep leapfrogging each other.
export async function bumpQueuePrompts() {
  await queuePromptMutex.runExclusive(async () => {
    const enabled = await queues.listEnabled()
    const fillRatios = new Map(
      await Promise.all(
        enabled.map(async queue => {
          const slots = await getSlots(queue._id)
          const ratio = slots.filter(slot => !!slot.player).length / slots.length
          return [queue._id.toHexString(), ratio] as const
        }),
      ),
    )

    await forEachEnabledChannel('queuePrompts', async (channel, config) => {
      const state = await collections.discordBotState.findOne({ guildId: channel.guild.id })
      const due = await Promise.all(
        [...fillRatios]
          .filter(([, ratio]) => ratio >= config.bumpPlayerThresholdRatio)
          .map(async ([key]) => ({
            key,
            message: await getMessage(channel, state?.promptMessageIds?.[key]),
          })),
      )
      const prompts = due.filter(({ message }) => message !== undefined)
      if (prompts.length === 0) {
        return
      }

      const latest = await channel.messages.fetch({ limit: prompts.length })
      for (const { key, message } of prompts) {
        if (latest.has(message!.id)) {
          continue
        }

        const { content, embeds } = message!
        await message!.delete()
        const sentMessage = await channel.send({ content, embeds })
        await collections.discordBotState.updateOne(
          { guildId: channel.guild.id },
          { $set: { [`promptMessageIds.${key}`]: sentMessage.id } },
        )
      }
    })
  })
}
