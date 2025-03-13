import { collections } from '../database/collections'
import type { ChatMessageModel } from '../database/models/chat-message.model'
import { errors } from '../errors'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'

interface SendParams {
  author: SteamId64
  body: string
}

export async function send(params: SendParams): Promise<ChatMessageModel> {
  await collections.chatMessages.insertOne({ ...params, at: new Date() })
  const message = await collections.chatMessages.findOne({}, { sort: { at: -1 } })
  if (!message) {
    throw errors.internalServerError('could not send chat message')
  }
  events.emit('chat:messageSent', { message })
  return message
}
