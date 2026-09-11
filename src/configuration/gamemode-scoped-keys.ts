import type { Configuration } from '../database/models/configuration-entry.model'
import type { Gamemode } from '../shared/types/gamemode'
import { defaultGamemode } from '../shared/default-gamemode'

// Configuration keys that hold an independent value per gamemode (no shared
// base — each gamemode falls back to the schema default, not another gamemode's
// value). Every other key stays global.
const perGamemodeKeys = new Set<keyof Configuration>([
  'games.whitelist_id',
  'queue.player_skill_threshold',
  'games.default_player_skill',
])

export function isGamemodeScoped(key: keyof Configuration): boolean {
  return perGamemodeKeys.has(key)
}

/**
 * The configuration document key under which a (key, gamemode) pair is stored.
 *
 * Global keys — and the default gamemode of a scoped key — use the bare key, so
 * existing data and single-gamemode instances keep working unchanged. Every
 * other gamemode of a scoped key is namespaced as `key#gamemode`.
 */
export function resolveStorageKey(
  key: keyof Configuration,
  gamemode: Gamemode | undefined,
): keyof Configuration {
  if (gamemode === undefined || gamemode === defaultGamemode || !isGamemodeScoped(key)) {
    return key
  }
  return `${key}#${gamemode}` as keyof Configuration
}
