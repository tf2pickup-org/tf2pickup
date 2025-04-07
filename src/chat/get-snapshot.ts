import { collections } from '../database/collections'
import type { ChatMessageModel } from '../database/models/chat-message.model'

export async function getSnapshot(params?: { limit?: number }): Promise<ChatMessageModel[]> {
  const limit = params?.limit ?? 20
  return (
    await collections.chatMessages.find({}, { sort: { at: -1 }, limit }).toArray()
  ).toReversed()
}
