import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'

/**
 * One player queued in captain mode.
 *
 * Unlike the auto queue there are no pre-made slots to occupy: a player holds a set of classes
 * they are willing to play, and which slot they end up in is decided by the captains during the
 * draft. The pool is deliberately allowed to grow past the size of a game.
 */
export interface CaptainsPoolEntryModel {
  player: {
    steamId: SteamId64
    name: string
    avatarUrl: string // medium
  }

  // at least one; emptying it leaves the queue
  gameClasses: Tf2ClassName[]

  // eligible players can put their hand up; two volunteers are drawn at random when the draft starts
  wantsToCaptain: boolean

  ready: boolean
  joinedAt: Date
}
