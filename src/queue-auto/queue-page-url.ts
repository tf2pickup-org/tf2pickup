import { defaultGamemode } from '../shared/default-gamemode'
import type { Gamemode } from '../shared/types/gamemode'

/**
 * The path a gamemode's queue page is served at. The default gamemode lives at
 * `/`; every other enabled gamemode gets its own `/<gamemode>` segment.
 */
export function queuePageUrl(gamemode: Gamemode): string {
  return gamemode === defaultGamemode ? '/' : `/${gamemode}`
}
