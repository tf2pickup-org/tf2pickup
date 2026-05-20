import fp from 'fastify-plugin'
import Anthropic from '@anthropic-ai/sdk'
import { client } from '../client'
import { environment } from '../../environment'
import { logger } from '../../logger'
import { configuration } from '../../configuration'
import { createSession, type AgentSession } from '../../agent/create-session'

function splitMessage(text: string, limit = 2000): string[] {
  if (text.length <= limit) return [text]
  const chunks: string[] = []
  let pos = 0
  while (pos < text.length) {
    let end = pos + limit
    if (end < text.length) {
      const newline = text.lastIndexOf('\n', end)
      if (newline > pos) end = newline + 1
    }
    chunks.push(text.slice(pos, end))
    pos = end
  }
  return chunks
}

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async () => {
    if (!client || !environment.ANTHROPIC_API_KEY) {
      return
    }

    const anthropic = new Anthropic({ apiKey: environment.ANTHROPIC_API_KEY })
    const sessions = new Map<string, AgentSession>()
    const bot = client

    bot.on('messageCreate', message => {
      if (message.author.bot) return
      if (!bot.user) return
      if (!message.mentions.has(bot.user.id)) return

      const question = message.content
        .replace(/<@!?\d+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!question) return

      void (async () => {
        const enabledChannels = await configuration.get('agent.channels')
        if (
          !enabledChannels.some(
            c => c.guildId === message.guildId && c.channelId === message.channelId,
          )
        ) {
          return
        }

        const isAdmin =
          (message.member?.permissions.has('Administrator') ??
            message.member?.permissions.has('ManageGuild')) === true

        const channelId = message.channelId
        const session = sessions.get(channelId) ?? createSession(anthropic, isAdmin)
        sessions.set(channelId, session)

        void message.channel.sendTyping().catch(() => {
          /* ignore */
        })

        const answer = await session.ask(question)
        for (const chunk of splitMessage(answer)) {
          await message.reply(chunk)
        }
      })().catch((err: unknown) => {
        logger.error(err, 'agent error')
        message.reply('Something went wrong.').catch(() => {
          /* ignore */
        })
      })
    })
  },
  { name: 'discord - agent' },
)
