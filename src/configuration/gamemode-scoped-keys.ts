import type { Configuration } from '../database/models/configuration-entry.model'
import type { Gamemode } from '../shared/types/gamemode'
import { defaultGamemode } from '../shared/enabled-gamemodes'

// Per-gamemode keys hold an independent value per gamemode (no shared base).
const perGamemodeKeys = new Set<keyof Configuration>([
  'games.default_player_skill',
  'games.whitelist_id',
  'queue.player_skill_threshold',
  'queue.map_cooldown',
  'games.auto_force_end_threshold',
])

// Inherited keys have a global base value that a gamemode may override.
const inheritedKeys = new Set<keyof Configuration>([
  'games.join_queue_cooldown',
  'games.execute_extra_commands',
])

export function isGamemodeScoped(key: keyof Configuration): boolean {
  return perGamemodeKeys.has(key) || inheritedKeys.has(key)
}

export function isInherited(key: keyof Configuration): boolean {
  return inheritedKeys.has(key)
}

/**
 * The configuration document key under which a (key, gamemode) pair is stored.
 *
 * Global keys, and the default gamemode of a scoped key, use the bare key so
 * existing data (and single-gamemode instances) keep working unchanged.
 * Non-default gamemodes of a scoped key are namespaced as `key#gamemode`.
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
