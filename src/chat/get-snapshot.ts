import type { Filter } from 'mongodb'
import { collections } from '../database/collections'
import type { ChatMessageModel } from '../database/models/chat-message.model'
import { logger } from '../logger'

export async function getSnapshot(params?: {
  limit?: number
  before?: Date
}): Promise<ChatMessageModel[]> {
  logger.debug({ params }, `chat.getSnapshot()`)
  const limit = params?.limit ?? 20

  let filter: Filter<ChatMessageModel> = {}
  if (params?.before) {
    filter = { at: { $lt: params.before } }
  }

  return await collections.chatMessages.find(filter, { sort: { at: -1 }, limit }).toArray()
}
