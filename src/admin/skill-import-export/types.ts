import type { PlayerSkill } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface ChangedPlayer {
  steamId: SteamId64
  name: string
  profileUrl: string
  oldSkill: PlayerSkill
  newSkill: PlayerSkill
}

export interface InitializedPlayer {
  steamId: SteamId64
  name: string
  profileUrl: string
  newSkill: PlayerSkill
}

export interface FuturePlayer {
  steamId: SteamId64
  name: string | undefined
  skill: PlayerSkill
}

export interface ImportAnalysis {
  changedPlayers: ChangedPlayer[]
  initializedPlayers: InitializedPlayer[]
  unaffectedCount: number
  futurePlayers: FuturePlayer[]
}
