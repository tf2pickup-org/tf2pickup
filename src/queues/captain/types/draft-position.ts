import type { SteamId64 } from '../../../shared/types/steam-id-64'
import type { Tf2Team } from '../../../shared/types/tf2-team'
import type { CaptainRole } from './captain-role'
import type { DraftPick } from './draft-pick'
import type { PoolPlayer } from './pool-player'

export interface DraftPosition {
  roles: readonly CaptainRole[]
  pool: readonly PoolPlayer[]
  captains: Readonly<Record<Tf2Team, SteamId64>>
  picks: readonly DraftPick[]
}
