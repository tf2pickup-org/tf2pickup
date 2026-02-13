import type { PlayerSkill } from './player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface FuturePlayerSkillModel {
  steamId: SteamId64
  skill: PlayerSkill
  actor: SteamId64
  createdAt: Date
}
