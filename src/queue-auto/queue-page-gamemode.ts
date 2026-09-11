import { enabledGamemodes } from '../shared/enabled-gamemodes'
import type { Gamemode } from '../shared/types/gamemode'
import { queuePageUrl } from './queue-page-url'

/**
 * The inverse of {@link queuePageUrl}: which gamemode's queue page a path
 * serves, or `undefined` when the path is not a queue page. Used to resolve
 * the gamemode of a websocket client from the URL it reported.
 */
export function queuePageGamemode(url: string): Gamemode | undefined {
  return enabledGamemodes.find(gamemode => queuePageUrl(gamemode) === url)
}
