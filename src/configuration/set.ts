import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'

export async function set<T extends keyof Configuration>(
  key: T,
  value: Configuration[T],
): Promise<void> {
  configurationSchema.parse({ key, value })
  await collections.configuration.updateOne({ key }, { $set: { value } }, { upsert: true })
}
