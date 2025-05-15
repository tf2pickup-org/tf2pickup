import { z } from 'zod'
import { GameState } from '../../database/models/game.model'

export const gamePreviewSchema = z.object({
  number: z.number(),
  map: z.string(),
  state: z.nativeEnum(GameState),
  score: z
    .object({
      red: z.number().optional(),
      blu: z.number().optional(),
    })
    .optional(),
  launchedAt: z.date(),
})
