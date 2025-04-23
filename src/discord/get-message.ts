import { DiscordAPIError, type TextBasedChannel } from 'discord.js'

export async function getMessage(channel: TextBasedChannel, messageId?: string) {
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
