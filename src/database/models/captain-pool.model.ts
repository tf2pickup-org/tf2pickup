import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { QueueId } from './queue.model'

export interface CaptainPoolModel {
  queue: QueueId
  player: {
    steamId: SteamId64
    name: string
    avatarUrl: string // medium
  }
  // role keys, see roleKey()
  roles: string[]
  volunteer: boolean
  ready: boolean
  // part of the running draft: can't change roles, volunteer or leave until it ends
  locked: boolean
  joinedAt: Date
}
