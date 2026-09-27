import { errors } from '../errors'
import { gamemodeConfigs } from '../gamemodes/configs'
import type { Gamemode } from '../shared/types/gamemode'

// Players have no skill in a gamemode that is not auto-balanced, so there is nothing to compare.
export function assertSkillThresholdAllowed(gamemode: Gamemode, skillThreshold: number | null) {
  if (skillThreshold !== null && !gamemodeConfigs[gamemode].autoBalance) {
    throw errors.badRequest(`${gamemode} queues have no skill threshold`)
  }
}
