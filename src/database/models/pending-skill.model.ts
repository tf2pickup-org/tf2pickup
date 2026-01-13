import type { PlayerSkill } from './player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface PendingSkillModel {
  steamId: SteamId64
  skill: PlayerSkill
  importedAt: Date
  importedBy: SteamId64
}
