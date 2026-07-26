import { collections } from '../database/collections'
import type {
  ActivityLogEntryModel,
  ActivityLogInput,
} from '../database/models/activity-log-entry.model'

export async function record(entry: ActivityLogInput): Promise<void> {
  await collections.activityLog.insertOne({
    ...entry,
    timestamp: new Date(),
  } satisfies ActivityLogEntryModel)
}
