import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'
import { events } from '../events'

export async function set<T extends keyof Configuration>(
  key: T,
  value: Configuration[T],
): Promise<void> {
  configurationSchema.parse({ key, value })
  await collections.configuration.updateOne({ key }, { $set: { value } }, { upsert: true })
  events.emit('configuration:updated', { key })
}
