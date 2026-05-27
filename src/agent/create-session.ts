import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../logger'
import { executeQuery, type QueryTool } from './execute-query'

const MAX_HISTORY = 20
const MAX_TOOL_ITERATIONS = 8

export interface AgentSession {
  ask(question: string): Promise<{ answer: string; inputTokens: number; outputTokens: number }>
  getHistory(): Anthropic.MessageParam[]
}

export function createSession(
  anthropic: Anthropic,
  systemPrompt: string,
  tools: Anthropic.Tool[],
  isAdmin = false,
  initialHistory: Anthropic.MessageParam[] = [],
): AgentSession {
  const history: Anthropic.MessageParam[] = [...initialHistory]

  async function ask(
    question: string,
  ): Promise<{ answer: string; inputTokens: number; outputTokens: number }> {
    const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: question }]

    let answer = 'Reached tool iteration limit without a final answer.'
    let iterations = 0
    let inputTokens = 0
    let outputTokens = 0

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
      })

      inputTokens += response.usage.input_tokens
      outputTokens += response.usage.output_tokens

      if (response.stop_reason === 'end_turn') {
        answer = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('')
        break
      }

      if (response.stop_reason === 'tool_use') {
        messages.push({ role: 'assistant', content: response.content })

        const toolResults: Anthropic.ToolResultBlockParam[] = []
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue

          logger.info({ tool: block.name, input: block.input }, 'agent tool call')

          let content: string
          try {
            const result = await executeQuery(
              block.name as QueryTool,
              block.input as Record<string, unknown>,
              isAdmin,
            )
            content = JSON.stringify(result)
          } catch (err) {
            content = `Error: ${err instanceof Error ? err.message : String(err)}`
          }

          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content })
        }

        messages.push({ role: 'user', content: toolResults })
      }
    }

    history.push({ role: 'user', content: question }, { role: 'assistant', content: answer })
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY)

    return { answer, inputTokens, outputTokens }
  }

  return { ask, getHistory: () => history }
}
