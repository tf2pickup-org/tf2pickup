import type { z } from 'zod'
import type { logsTfLogResponseSchema } from '../../logs-tf/logs-tf-log-response'
import type { GameNumber } from './game.model'

export type LogsTfLogData = z.infer<typeof logsTfLogResponseSchema>

export interface LogsTfLogModel {
  logId: number
  gameNumber: GameNumber
  fetchedAt: Date
  data: LogsTfLogData
}
