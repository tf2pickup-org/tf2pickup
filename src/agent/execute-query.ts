import { database } from '../database/database'
import type { Sort } from 'mongodb'

const allowedCollections = new Set(['players', 'games', 'gamelogs', 'logstf.logs', 'maps', 'stats'])
const adminOnlyCollections = new Set(['playeractions'])
const blockedPipelineStages = new Set(['$out', '$merge'])

export type QueryTool = 'find_documents' | 'aggregate'

export async function executeQuery(
  toolName: QueryTool,
  input: Record<string, unknown>,
  isAdmin: boolean,
): Promise<unknown> {
  const collection = input['collection'] as string

  if (!allowedCollections.has(collection) && !(isAdmin && adminOnlyCollections.has(collection))) {
    throw new Error(`Collection "${collection}" is not accessible`)
  }

  if (adminOnlyCollections.has(collection) && !isAdmin) {
    throw new Error(`Collection "${collection}" requires admin access`)
  }

  const coll = database.collection(collection)

  if (toolName === 'find_documents') {
    const filter = (input['filter'] as Record<string, unknown> | undefined) ?? {}
    const projection = (input['projection'] as Record<string, unknown> | undefined) ?? {}
    const sort = (input['sort'] as Sort | undefined) ?? {}
    const limit = Math.min((input['limit'] as number | undefined) ?? 10, 25)

    return await coll.find(filter, { projection, limit }).sort(sort).toArray()
  }

  const pipeline = input['pipeline'] as Record<string, unknown>[]

  for (const stage of pipeline) {
    for (const key of Object.keys(stage)) {
      if (blockedPipelineStages.has(key)) {
        throw new Error(`Pipeline stage "${key}" is not allowed`)
      }
    }
  }

  const hasLimit = pipeline.some(stage => '$limit' in stage)
  const safePipeline = hasLimit ? pipeline : [...pipeline, { $limit: 25 }]

  return await coll.aggregate(safePipeline).toArray()
}
