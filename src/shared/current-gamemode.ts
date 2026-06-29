import { environment } from '../environment'
import type { Gamemode } from './types/gamemode'

/**
 * The single gamemode this instance currently runs.
 *
 * Phase 1 bridge: while the queue and games are still single-gamemode, call
 * sites that need "the" gamemode read it from here. Phase 2+ replaces these
 * usages with per-context resolution (the queue's gamemode, the game's
 * gamemode, the selected UI tab).
 */
export const currentGamemode: Gamemode = environment.QUEUE_CONFIG
