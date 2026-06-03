import { collections } from '../database/collections'
import type {
  ActivityLogEntryModel,
  ActivityLogInput,
} from '../database/models/activity-log-entry.model'

export async function recordActivity(entry: ActivityLogInput): Promise<void> {
  await collections.activityLog.insertOne({
    ...entry,
    timestamp: new Date(),
  } as ActivityLogEntryModel)
}
