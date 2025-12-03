import type { Filter } from 'mongodb'
import { startOfDay } from 'date-fns'
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

  const messages = await collections.chatMessages
    .find(filter, { sort: { at: -1 }, limit })
    .toArray()

  if (messages.length === 0) {
    return messages
  }

  const oldest = messages[messages.length - 1]!
  const oldestDayStart = startOfDay(oldest.at)

  const extraSameDayMessages = await collections.chatMessages
    .find(
      {
        at: {
          $lt: oldest.at,
          $gte: oldestDayStart,
        },
      },
      {
        sort: { at: -1 },
      },
    )
    .toArray()

  return [...messages, ...extraSameDayMessages]
}
