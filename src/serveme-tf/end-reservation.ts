import { z } from 'zod'
import { servemeTfApiRequest } from './serveme-tf-api-request'
import { logger } from '../logger'
import type { ReservationId } from './types/reservation-id'

export async function endReservation(id: ReservationId): Promise<void> {
  await servemeTfApiRequest(z.object({}), `reservations/${id}`, { method: 'DELETE' })
  logger.debug({ reservationId: id }, 'serveme.tf reservation ended')
}
