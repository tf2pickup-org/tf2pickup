import type { UserName } from '../user-manager'

export const skilledPlayer: UserName = 'Mayflower'
export const skilledPlayerSkill = { scout: 5, soldier: 4, demoman: 3, medic: 2 }
export const defaultPlayerSkill = { medic: 3 }
export const playerSkillThreshold = 1
export const mapPool = [
  { name: 'cp_upgrade_a', execConfig: 'upgrade_config_a' },
  { name: 'cp_upgrade_b', execConfig: 'upgrade_config_b' },
  { name: 'koth_upgrade_c', execConfig: 'upgrade_config_c' },
]
