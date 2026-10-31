import type { PlayerSkill } from './player.model'
import type { Gamemode } from '../../shared/types/gamemode'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface FuturePlayerSkillModel {
  steamId: SteamId64
  gamemode: Gamemode
  skill: PlayerSkill
  actor: SteamId64
  createdAt: Date
}
