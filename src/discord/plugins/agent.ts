import fp from 'fastify-plugin'
import Anthropic from '@anthropic-ai/sdk'
import { client } from '../client'
import { environment } from '../../environment'
import { logger } from '../../logger'
import { configuration } from '../../configuration'
import { createSession, type AgentSession } from '../../agent/create-session'
import { isOverBudget, recordUsage, getUsage } from '../../agent/daily-budget'
import { collections } from '../../database/collections'

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
    // Maps bot reply message ID → session key, to continue reply chains
    const botMessageToSession = new Map<string, string>()
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
        // For threads, check the parent channel against the enabled list
        const effectiveChannelId = message.channel.isThread()
          ? (message.channel.parentId ?? message.channelId)
          : message.channelId

        const enabledChannels = await configuration.get('agent.channels')
        if (
          !enabledChannels.some(
            c => c.guildId === message.guildId && c.channelId === effectiveChannelId,
          )
        ) {
          return
        }

        const isAdmin =
          (message.member?.permissions.has('Administrator') ??
            message.member?.permissions.has('ManageGuild')) === true

        const dailyTokenBudget = await configuration.get('agent.daily_token_budget')
        if (dailyTokenBudget !== null && (await isOverBudget(dailyTokenBudget))) {
          const { inputTokens, outputTokens } = await getUsage()
          logger.warn(
            { inputTokens, outputTokens, limit: dailyTokenBudget },
            'agent daily token budget exceeded',
          )
          await message.reply("I've reached my daily usage limit. Try again tomorrow.")
          return
        }

        // Determine session key:
        //   - thread      → thread channel ID (one session per thread)
        //   - reply chain → follow the in-memory map back to the root session key
        //   - new mention → this message's ID starts a fresh session
        let sessionKey: string
        if (message.channel.isThread()) {
          sessionKey = message.channelId
        } else if (message.reference?.messageId) {
          sessionKey = botMessageToSession.get(message.reference.messageId) ?? message.id
        } else {
          sessionKey = message.id
        }

        let session = sessions.get(sessionKey)
        if (!session) {
          const saved = await collections.agentSessions.findOne({ sessionKey })
          session = createSession(anthropic, isAdmin, saved?.history ?? [])
          sessions.set(sessionKey, session)
        }

        void message.channel.sendTyping().catch(() => {
          /* ignore */
        })

        const { answer, inputTokens, outputTokens } = await session.ask(question)
        await Promise.all([
          recordUsage(inputTokens, outputTokens),
          collections.agentSessions.updateOne(
            { sessionKey },
            { $set: { history: session.getHistory(), updatedAt: new Date() } },
            { upsert: true },
          ),
        ])
        logger.info(
          { inputTokens, outputTokens, totalToday: await getUsage() },
          'agent token usage',
        )

        for (const chunk of splitMessage(answer)) {
          const sent = await message.reply(chunk)
          botMessageToSession.set(sent.id, sessionKey)
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
