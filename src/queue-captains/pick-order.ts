import type { QueueConfig } from '../queue/types/queue-config'
import { Tf2Team } from '../shared/types/tf2-team'
import { teamSlots } from './team-slots'

/**
 * Who picks on each turn. BLU takes a single first pick, then the teams alternate in pairs:
 * BLU, RED RED, BLU BLU, RED RED, … — ten turns for 6v6, sixteen for 9v9, split evenly.
 *
 * Both captains are already in the queue, so they account for two of the slots themselves and are
 * never picked.
 */
export function pickOrder(config: QueueConfig): Tf2Team[] {
  const turns = teamSlots(config).length - 2
  return Array.from({ length: turns }, (_, turn) =>
    turn === 0 || Math.floor((turn - 1) / 2) % 2 === 1 ? Tf2Team.blu : Tf2Team.red,
  )
}
