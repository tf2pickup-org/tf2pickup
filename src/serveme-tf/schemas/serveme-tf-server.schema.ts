import { z } from 'zod'
import type { ServerId } from '../types/server-id'

export const servemeTfServerSchema = z.object({
  id: z.number().transform(id => id as ServerId),
  name: z.string(),
  flag: z.string(),
  ip: z.string(),
  port: z.string(),
  ip_and_port: z.string(),
  sdr: z.boolean(),
})
