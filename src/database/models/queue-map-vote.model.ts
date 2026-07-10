import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Gamemode } from '../../shared/types/gamemode'

export interface QueueMapVoteModel {
  gamemode: Gamemode
  player: SteamId64
  map: string
}
