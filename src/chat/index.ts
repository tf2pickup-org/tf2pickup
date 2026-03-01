import { deleteMessage } from './delete-message'
import { getSnapshot } from './get-snapshot'
import { send } from './send'

export const chat = {
  deleteMessage,
  getSnapshot,
  send,
} as const
