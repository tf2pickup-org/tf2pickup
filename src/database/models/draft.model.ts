import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { Tf2Team } from '../../shared/types/tf2-team'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface DraftPickModel {
  captain: SteamId64
  player: SteamId64
  gameClass: Tf2ClassName
  team: Tf2Team
}

export interface DraftMapBanModel {
  captain: SteamId64
  team: Tf2Team
  map: string
}

export interface DraftModel {
  captains: Record<Tf2Team, SteamId64>
  picks: DraftPickModel[]
  mapOptions: string[]
  mapBans: DraftMapBanModel[]
  selectedMap?: string
  currentTurn: Tf2Team
  expiresAt: Date
}
