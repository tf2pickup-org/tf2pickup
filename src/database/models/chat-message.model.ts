import type { SteamId64 } from '../../shared/types/steam-id-64'

// a copy of the author's player, kept in sync on rename and role change, so reading the chat
// takes no player lookups
export interface ChatMessageAuthor {
  steamId: SteamId64
  name: string
  admin: boolean
}

export interface ChatMessageModel {
  at: Date
  author: ChatMessageAuthor
  body: string
  mentions: SteamId64[]
  originalBody: string
  deletedAt?: Date
}
