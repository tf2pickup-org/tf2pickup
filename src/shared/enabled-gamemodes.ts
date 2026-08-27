import { environment } from '../environment'
import { Gamemode } from './types/gamemode'

/**
 * The set of gamemodes this instance serves, fixed at boot.
 *
 * Configured via `ENABLED_GAMEMODES` (comma-separated, e.g. `6v6,9v9`). For
 * backwards compatibility it falls back to the legacy single `QUEUE_CONFIG`
 * when `ENABLED_GAMEMODES` is unset, so existing deployments keep working with
 * no env change. The first entry is the instance default.
 */
function parseEnabledGamemodes(): Gamemode[] {
  const known = new Set<string>(Object.values(Gamemode))
  const parsed = (environment.ENABLED_GAMEMODES ?? environment.QUEUE_CONFIG)
    .split(',')
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
