import { collections } from '../database/collections'
import type { ChatMessageModel } from '../database/models/chat-message.model'
import { errors } from '../errors'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { formatBody } from './format-body'

interface SendParams {
  author: SteamId64
  body: string
}

export async function send(params: SendParams): Promise<ChatMessageModel> {
  const originalBody = params.body
  const formattedBody = formatBody(originalBody)

  await collections.chatMessages.insertOne({
    author: params.author,
    originalBody,
    body: formattedBody,
    at: new Date(),
  })
  const message = await collections.chatMessages.findOne({}, { sort: { at: -1 } })
  if (!message) {
    throw errors.internalServerError('could not send chat message')
  }
  events.emit('chat:messageSent', { message })
  return message
}
