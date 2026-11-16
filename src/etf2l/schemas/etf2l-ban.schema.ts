import { z } from 'zod'
import { steamId64 } from '../../shared/schemas/steam-id-64'

export const etf2lBanSchema = z.object({
  start: z.number(),
  steamid64: steamId64,
})
