import { config } from '../queue-auto/config'
import { getPool } from './get-pool'
import { queueReadiness, type QueueReadiness } from './matching/queue-readiness'

export interface CaptainsQueueReadiness extends QueueReadiness {
  poolSize: number
  captainVolunteers: number
  captainsNeeded: number
  isFull: boolean
}

/**
 * Everything the readiness meter shows. The queue is full when the pool can fill every slot and
 * at least two eligible players have volunteered to captain — a headcount would not do, because
 * players sign up on several classes at once.
 */
export async function getReadiness(): Promise<CaptainsQueueReadiness> {
  const pool = await getPool()
  const readiness = queueReadiness(
    pool.map(({ player, gameClasses }) => ({ steamId: player.steamId, gameClasses })),
    config,
  )
  const captainVolunteers = pool.filter(entry => entry.wantsToCaptain).length
  const captainsNeeded = 2

  return {
    ...readiness,
    poolSize: pool.length,
    captainVolunteers,
    captainsNeeded,
    isFull: readiness.fillable === readiness.required && captainVolunteers >= captainsNeeded,
  }
}
