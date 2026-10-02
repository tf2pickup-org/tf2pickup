import type { QueueId } from './queue.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface QueueMapVoteModel {
  queue: QueueId
  player: SteamId64
  map: string
}
