import Anthropic from '@anthropic-ai/sdk'

export const queryTools: Anthropic.Tool[] = [
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

export const submitReviewTool: Anthropic.Tool = {
  name: 'submit_review',
  description: 'Submit the final skill adjustment recommendations for this game.',
  input_schema: {
    type: 'object' as const,
    properties: {
      changes: {
        type: 'array',
        description: 'Players whose skill should change. Omit players who should stay the same.',
        items: {
          type: 'object',
          properties: {
            steamId: { type: 'string' },
            gameClass: { type: 'string' },
            newSkill: { type: 'number' },
            reasoning: {
              type: 'string',
              description: 'One or two sentences explaining the change.',
            },
          },
          required: ['steamId', 'gameClass', 'newSkill', 'reasoning'],
        },
      },
      summary: {
        type: 'string',
        description:
          'Brief overall assessment of the game and the reasoning behind the changes (or why no changes were made).',
      },
    },
    required: ['changes', 'summary'],
  },
}
