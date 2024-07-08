import { z } from 'zod'
import type { GameNumber } from '../../database/models/game.model'

export const gameNumber = z.coerce
  .number()
  .positive()
  .transform(n => n as GameNumber)
