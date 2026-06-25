import type { ReservationId } from './api'
import { get } from './cache'
import { logger } from '../logger'

export async function waitForStart(reservationId: ReservationId) {
  const r = await get(reservationId)
  await r.waitForStarted()
  logger.debug({ reservationId: r.id }, `gameserver started`)
}
