import type { GameNumber } from './game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { Tf2Team } from '../../shared/types/tf2-team'

declare const _draftId: unique symbol
export type DraftId = string & { [_draftId]: never }

export enum DraftState {
  // captains are taking turns picking players
  picking = 'picking',

  // teams are set; captains are banning maps down to the one they will play
  banningMaps = 'banning maps',

  // teams and map are settled, the game has been created
  completed = 'completed',
}

export interface DraftMapBan {
  team: Tf2Team
  map: string
  at: Date

  // the captain ran out of time and a map was banned for them
  auto?: boolean
}

export interface DraftPick {
  team: Tf2Team
  player: SteamId64
  gameClass: Tf2ClassName
  at: Date

  // the captain ran out of time and a pick was made for them
  auto?: boolean

  // only one legal option was left, so the turn was committed without waiting
  forced?: boolean
}

/**
 * A draft is both the live state and its own permanent log: the pool is frozen when it starts and
 * every turn is appended in order, so any finished draft can be replayed exactly as it happened.
 */
export interface DraftModel {
  id: DraftId
  state: DraftState
  createdAt: Date

  captains: Record<Tf2Team, SteamId64>

  // frozen snapshot — the pool can change underneath, the draft cannot
  pool: {
    steamId: SteamId64
    name: string
    avatarUrl: string
    gameClasses: Tf2ClassName[]
  }[]

  picks: DraftPick[]

  // the three candidates, in the order they were offered
  mapOptions: string[]

  // one per ban, in order; whatever option is left unbanned is the map
  mapBans: DraftMapBan[]

  // the game this draft produced, once it exists
  game?: GameNumber

  // when the captain on the clock runs out of time; absent once the draft is over
  turnEndsAt?: Date
}
