import { errors } from '../errors'
import { gamemodeConfigs } from '../gamemodes/configs'
import type { Gamemode } from '../shared/types/gamemode'

export function assertCaptainAllowed(gamemode: Gamemode) {
  if (!gamemodeConfigs[gamemode].captainRoles) {
    throw errors.badRequest(`${gamemode} queues cannot use captain mode`)
  }
}
