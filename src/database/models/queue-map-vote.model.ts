import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface QueueMapVoteModel {
  player: SteamId64
  map: string
}
