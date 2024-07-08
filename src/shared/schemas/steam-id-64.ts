import { z } from 'zod'
import type { SteamId64 } from '../types/steam-id-64'

export const steamId64 = z
  .string()
  .regex(/[0-9]{17}/)
  .transform(value => value as SteamId64)
