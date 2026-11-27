import { keyedMutex } from '../utils/keyed-mutex'

// serializes per-game handling of match events that read or write the game's
// round state, so they apply in the order the game server logged them
export const matchEventsMutex = keyedMutex()
