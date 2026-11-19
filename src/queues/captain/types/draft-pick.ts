import type { SteamId64 } from '../../../shared/types/steam-id-64'
import type { Tf2Team } from '../../../shared/types/tf2-team'

export interface DraftPick {
  team: Tf2Team
  player: SteamId64
  role: string
}
