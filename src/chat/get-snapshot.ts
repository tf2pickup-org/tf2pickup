import type { Filter, WithId } from 'mongodb'
import { startOfDay } from 'date-fns'
import { collections } from '../database/collections'
import type { ChatMessageModel } from '../database/models/chat-message.model'
import { logger } from '../logger'

export async function getSnapshot(params?: {
  limit?: number
  before?: Date
}): Promise<WithId<ChatMessageModel>[]> {
  logger.debug({ params }, `chat.getSnapshot()`)
  const limit = params?.limit ?? 20

  const baseFilter: Filter<ChatMessageModel> = { deletedAt: { $exists: false } }
  if (params?.before) {
    baseFilter.at = { $lt: params.before }
  }

  const messages = await collections.chatMessages
    .find(baseFilter, { sort: { at: -1 }, limit })
    .toArray()

  if (messages.length === 0) {
    return messages
  }

  const oldest = messages[messages.length - 1]!
  const oldestDayStart = startOfDay(oldest.at)

  const extraSameDayMessages = await collections.chatMessages
    .find(
      {
        deletedAt: { $exists: false },
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
