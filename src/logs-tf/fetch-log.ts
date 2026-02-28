import { logsTfLogResponseSchema } from './logs-tf-log-response'
import type { LogsTfLogData } from '../database/models/logs-tf-log.model'

export async function fetchLog(logId: number): Promise<LogsTfLogData> {
  const response = await fetch(`https://logs.tf/api/v1/log/${logId}`)
  if (!response.ok) {
    throw new Error(`logs.tf API responded with ${response.status} for log ${logId}`)
  }
  return logsTfLogResponseSchema.parse(await response.json())
}
