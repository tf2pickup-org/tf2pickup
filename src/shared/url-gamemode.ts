import { defaultGamemode, enabledGamemodes } from './enabled-gamemodes'
import type { Gamemode } from './types/gamemode'

/**
 * The gamemode a queue-page URL points at (`/?gamemode=9v9`). Bare `/`, an
 * unknown value or a disabled gamemode all resolve to the instance default.
 */
export function urlGamemode(url: string): Gamemode {
  const param = new URL(url, 'http://localhost').searchParams.get('gamemode')
  return enabledGamemodes.includes(param as Gamemode) ? (param as Gamemode) : defaultGamemode
}
