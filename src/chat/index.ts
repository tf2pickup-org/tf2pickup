import { getSnapshot } from './get-snapshot'
import { send } from './send'

export const chat = {
  getSnapshot,
  send,
} as const
