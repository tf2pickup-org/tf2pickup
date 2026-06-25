import { z } from 'zod'
import { servemeTfApiRequest } from './serveme-tf-api-request'
import { servemeTfReservationSchema } from './schemas/serveme-tf-reservation.schema'
import type { ServemeTfReservation } from './types/serveme-tf-reservation'
import type { ReservationId } from './types/reservation-id'

const responseSchema = z.object({
  reservation: servemeTfReservationSchema,
})

export async function fetchReservation(id: ReservationId): Promise<ServemeTfReservation> {
  const { reservation } = await servemeTfApiRequest(responseSchema, `reservations/${id}`)
  return reservation
}
