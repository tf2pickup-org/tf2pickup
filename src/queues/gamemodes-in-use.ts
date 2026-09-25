import type { Gamemode } from '../shared/types/gamemode'
import { listEnabled } from './list-enabled'

// Gamemodes of the enabled queues, in queue order.
export async function gamemodesInUse(): Promise<Gamemode[]> {
  return [...new Set((await listEnabled()).map(({ gamemode }) => gamemode))]
}
