import { enabledGamemodes } from './enabled-gamemodes'

/**
 * The instance's default gamemode (the first enabled one). Call sites that need
 * "the" gamemode but aren't yet gamemode-aware read it from here; where a
 * queue's or a game's own gamemode is in scope, prefer that instead.
 */
export const defaultGamemode = enabledGamemodes[0]!
