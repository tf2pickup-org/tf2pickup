import { z } from 'zod'
import { servemeTfServerSchema } from './serveme-tf-server.schema'
import type { ReservationId } from '../types/reservation-id'

export const servemeTfReservationSchema = z.object({
  id: z.number().transform(id => id as ReservationId),
  status: z.string(),
  rcon: z.string(),
  logsecret: z.string(),
  server: servemeTfServerSchema,
})
