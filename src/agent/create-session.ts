import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../logger'
import { systemPrompt } from './system-prompt'
import { executeQuery, type QueryTool } from './execute-query'

const MAX_HISTORY = 20
const MAX_TOOL_ITERATIONS = 8

const tools: Anthropic.Tool[] = [
  {
    name: 'find_documents',
    description:
      'Run a MongoDB find() query. Use for simple lookups — fetching a player by name, getting a specific game by number, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        collection: {
          type: 'string',
          description: 'Collection name (e.g. "players", "games", "logstf.logs")',
        },
        filter: { type: 'object', description: 'MongoDB filter object' },
        projection: { type: 'object', description: 'Fields to include (1) or exclude (0)' },
        sort: { type: 'object', description: 'Sort fields and direction (1 asc, -1 desc)' },
        limit: { type: 'number', description: 'Max documents to return (hard-capped at 25)' },
      },
      required: ['collection'],
    },
  },
  {
    name: 'aggregate',
    description:
      'Run a MongoDB aggregation pipeline. Use for statistics, grouping, averages (e.g. average DPM across games, top players by game count).',
    input_schema: {
      type: 'object' as const,
      properties: {
        collection: { type: 'string', description: 'Collection name' },
        pipeline: {
          type: 'array',
          description: 'Array of aggregation stage objects (e.g. [$match, $group, $sort, $limit])',
          items: { type: 'object' },
        },
      },
      required: ['collection', 'pipeline'],
    },
  },
]

export interface AgentSession {
  ask(question: string): Promise<{ answer: string; inputTokens: number; outputTokens: number }>
  getHistory(): Anthropic.MessageParam[]
}

export function createSession(
  anthropic: Anthropic,
  isAdmin: boolean,
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
        system: systemPrompt(isAdmin),
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
