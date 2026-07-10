import type { Gamemode } from './types/gamemode'
import { defaultGamemode } from './enabled-gamemodes'

/**
 * The instance's default gamemode (the first enabled one).
 *
 * Call sites that need "the" gamemode but aren't yet gamemode-aware read it
 * from here. Where a queue's or a game's gamemode is in scope, prefer that
 * over this default (the queue's gamemode, the game's gamemode, the selected
 * UI tab).
 */
export const currentGamemode: Gamemode = defaultGamemode
