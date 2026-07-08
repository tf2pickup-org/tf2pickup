import { environment } from '../environment'
import { Gamemode } from './types/gamemode'

/**
 * The set of gamemodes this instance serves, fixed at boot.
 *
 * Configured via `ENABLED_GAMEMODES` (comma-separated, e.g. `6v6,9v9`). The
 * first entry is the instance default (pre-selected queue, atlas heartbeat
 * primary).
 */
function parseEnabledGamemodes(): Gamemode[] {
  const known = new Set<string>(Object.values(Gamemode))
  const parsed = environment.ENABLED_GAMEMODES.split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => {
      if (!known.has(value)) {
        throw new Error(`unknown gamemode in ENABLED_GAMEMODES: ${value}`)
      }
      return value as Gamemode
    })

  if (parsed.length === 0) {
    throw new Error('ENABLED_GAMEMODES must list at least one gamemode')
  }

  return [...new Set(parsed)]
}

export const enabledGamemodes: Gamemode[] = parseEnabledGamemodes()

export const defaultGamemode: Gamemode = enabledGamemodes[0]!
