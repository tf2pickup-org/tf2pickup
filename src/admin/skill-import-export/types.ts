import type { PlayerSkill } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

export interface SkillConflict {
  steamId: SteamId64
  playerName: string
  currentSkill: PlayerSkill
  importedSkill: PlayerSkill
}
