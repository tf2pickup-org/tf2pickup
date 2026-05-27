import type Anthropic from '@anthropic-ai/sdk'

export interface AgentSessionModel {
  sessionKey: string // thread channelId for threads, root message ID for reply chains
  history: Anthropic.MessageParam[]
  updatedAt: Date
}
