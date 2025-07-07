import { z } from 'zod'
import { steamId64 } from '../../shared/schemas/steam-id-64'
import { PlayerRole } from '../../database/models/player.model'

export const playerSchema = z.object({
  name: z.string(),
  steamId: steamId64,
  joinedAt: z.date(),
  avatar: z.object({
    small: z.string(),
    medium: z.string(),
    large: z.string(),
  }),
  roles: z.array(z.nativeEnum(PlayerRole)),
})
