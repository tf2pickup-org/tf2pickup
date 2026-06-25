import type { z } from 'zod'
import type { servemeTfReservationSchema } from '../schemas/serveme-tf-reservation.schema'

export type ServemeTfReservation = z.infer<typeof servemeTfReservationSchema>
