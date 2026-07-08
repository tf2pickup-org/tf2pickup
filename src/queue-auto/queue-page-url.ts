import { defaultGamemode } from '../shared/enabled-gamemodes'
import type { Gamemode } from '../shared/types/gamemode'

export function queuePageUrl(gamemode: Gamemode): string {
  return gamemode === defaultGamemode ? '/' : `/${gamemode}`
}
