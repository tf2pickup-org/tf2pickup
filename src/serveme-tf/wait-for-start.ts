import { secondsToMilliseconds } from 'date-fns'
import { delay } from 'es-toolkit'
import { fetchReservation } from './fetch-reservation'
import { ReservationStatus } from './types/reservation-status'
import { logger } from '../logger'
import type { ReservationId } from './types/reservation-id'

const pollInterval = secondsToMilliseconds(5)
const timeout = secondsToMilliseconds(30)

const endedStatuses: string[] = [ReservationStatus.ending, ReservationStatus.ended]
const startedStatuses: string[] = [ReservationStatus.ready, ReservationStatus.sdrReady]

export async function waitForStart(reservationId: ReservationId): Promise<void> {
  const deadline = Date.now() + timeout

  for (;;) {
    const { status } = await fetchReservation(reservationId)

    if (endedStatuses.includes(status)) {
      throw new Error(`serveme.tf reservation ${reservationId} is ${status}`)
    }

    if (startedStatuses.includes(status)) {
      logger.debug({ reservationId }, 'serveme.tf reservation started')
      return
    }

    if (Date.now() >= deadline) {
      throw new Error(`timed out waiting for serveme.tf reservation ${reservationId} to start`)
    }

    await delay(pollInterval)
  }
}
