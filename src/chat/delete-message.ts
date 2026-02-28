import { ObjectId } from 'mongodb'
import { collections } from '../database/collections'
import { events } from '../events'

export async function deleteMessage(id: string): Promise<void> {
  await collections.chatMessages.updateOne(
    { _id: new ObjectId(id) },
    { $set: { deletedAt: new Date() } },
  )
  events.emit('chat:messageDeleted', { messageId: id })
}
