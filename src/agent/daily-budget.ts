import { collections } from '../database/collections'

function today(): string {
  return new Date().toISOString().split('T')[0]!
}

export async function recordUsage(inputTokens: number, outputTokens: number): Promise<void> {
  await collections.agentTokenUsage.updateOne(
    { date: today() },
    { $inc: { inputTokens, outputTokens } },
    { upsert: true },
  )
}

export async function isOverBudget(limit: number): Promise<boolean> {
  const doc = await collections.agentTokenUsage.findOne({ date: today() })
  if (!doc) return false
  return doc.inputTokens + doc.outputTokens >= limit
}

export async function getUsage(): Promise<{ inputTokens: number; outputTokens: number }> {
  const doc = await collections.agentTokenUsage.findOne({ date: today() })
  return { inputTokens: doc?.inputTokens ?? 0, outputTokens: doc?.outputTokens ?? 0 }
}
