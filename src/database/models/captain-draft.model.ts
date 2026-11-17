import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Tf2Team } from '../../shared/types/tf2-team'
import type { QueueId } from './queue.model'

export interface CaptainDraftPickModel {
  team: Tf2Team
  player: SteamId64
  // role key, see roleKey()
  role: string
  at: Date
  how: 'chosen' | 'forced' | 'timedOut'
}

// At most one per queue; deleted when the draft ends.
export interface CaptainDraftModel {
  queue: QueueId
  // tells this draft's timers from those of an earlier one
  token: string
  red: SteamId64
  blu: SteamId64
  picks: CaptainDraftPickModel[]
  // index into draftTurns(): the turn on the clock
  turn: number
  turnStartedAt: Date
  turnDeadline: Date
  startedAt: Date
  mapOptions: string[]
  bans: { team: Tf2Team; map: string; at: Date; how: 'chosen' | 'timedOut' }[]
}
