import type Anthropic from '@anthropic-ai/sdk'

export interface AgentSessionModel {
  channelId: string
  history: Anthropic.MessageParam[]
  updatedAt: Date
}
