import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { Tf2Team } from '../../shared/types/tf2-team'

export interface DraftCandidate {
  steamId: SteamId64

  // every class this player signed up for
  gameClasses: Tf2ClassName[]

  // captains are locked to their own team; everyone else can end up on either side
  team?: Tf2Team
}
