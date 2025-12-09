import { collections } from '../database/collections'
import type { ChatMessageModel } from '../database/models/chat-message.model'
import { errors } from '../errors'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { formatBody } from './format-body'
import { Mutex } from 'async-mutex'
import { escape } from 'es-toolkit'

interface SendParams {
  author: SteamId64
  body: string
}

const mutex = new Mutex()

export async function send(params: SendParams): Promise<ChatMessageModel> {
  return await mutex.runExclusive(async () => {
    const originalBody = escape(params.body)
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

    const previousMessage = await collections.chatMessages.findOne(
      { at: { $lt: message.at } },
      {
        sort: { at: -1 },
      },
    )
    events.emit('chat:messageSent', { message, previousMessage: previousMessage ?? undefined })
    return message
  })
}
