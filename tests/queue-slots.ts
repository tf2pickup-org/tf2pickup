// Re-export shim kept for backwards compatibility — the gamemode knowledge now
// lives in ./gamemodes. `getQueueConfig` is the legacy name for `currentGamemode`.
import { currentGamemode } from './gamemodes'

export { type SlotId, queueSlots, getPlayerCount } from './gamemodes'

export function getQueueConfig(): '6v6' | '9v9' {
  return currentGamemode()
}
