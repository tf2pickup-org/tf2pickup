import { z } from 'zod'
import { steamId64 } from '../../shared/schemas/steam-id-64'
import { gamePreviewSchema } from './game-preview.schema'

export const gameSchema = gamePreviewSchema.extend({
  slots: z.array(
    z.object({
      id: z.string(),
      player: steamId64,
      team: z.enum(['red', 'blu']),
      gameClass: z.string(),
      status: z.enum(['active', 'waiting for substitute']),
      connectionStatus: z.enum(['offline', 'joining', 'connected']),
    }),
  ),
  gameServer: z.string().optional(),
  logsUrl: z.string().optional(),
  demoUrl: z.string().optional(),
})
