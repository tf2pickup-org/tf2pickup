import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface ChatMessageModel {
  at: Date
  author: SteamId64
  body: string
}
