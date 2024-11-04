import type { ObjectId } from 'mongodb'
import type { SteamId64 } from './steam-id-64'

export type Bot = 'bot'

export function isBot(playerOrBot: SteamId64 | ObjectId | 'bot'): playerOrBot is Bot {
  return playerOrBot === 'bot'
}
