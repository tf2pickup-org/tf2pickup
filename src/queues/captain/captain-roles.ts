import { gamemodeConfigs } from '../../gamemodes/configs'
import type { Gamemode } from '../../shared/types/gamemode'
import type { CaptainRole } from './types/captain-role'

export function captainRoles(gamemode: Gamemode): readonly CaptainRole[] {
  return gamemodeConfigs[gamemode].captainRoles ?? []
}
