import { defaultGamemode, enabledGamemodes } from './enabled-gamemodes'
import type { Gamemode } from './types/gamemode'

/**
 * The gamemode a queue-page URL points at: `/` is the instance default,
 * `/6v6`, `/9v9` etc. address a specific enabled gamemode. Returns undefined
 * for URLs that are not a queue page.
 */
export function queuePageGamemode(url: string): Gamemode | undefined {
  const pathname = new URL(url, 'http://localhost').pathname
  if (pathname === '/') {
    return defaultGamemode
  }

  const candidate = pathname.slice(1) as Gamemode
  return enabledGamemodes.includes(candidate) ? candidate : undefined
}
