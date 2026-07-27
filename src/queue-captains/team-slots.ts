import type { QueueConfig } from '../queue/types/queue-config'
import { Tf2Team } from '../shared/types/tf2-team'
import type { TeamSlot } from './types/team-slot'

/**
 * Every slot a finished game has to fill — for 6v6 that is 4 scouts, 4 soldiers, 2 demomen and
 * 2 medics, split evenly across the two teams.
 */
export function teamSlots(config: QueueConfig): TeamSlot[] {
  return [Tf2Team.blu, Tf2Team.red].flatMap(team =>
    config.classes.flatMap(({ name, count }) =>
      Array.from({ length: count }, () => ({ team, gameClass: name })),
    ),
  )
}
