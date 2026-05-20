import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'
import { events } from '../events'

type ConfigurationEntry<T extends keyof Configuration> = [key: T, value: Configuration[T]]

export async function setMulti<T extends keyof Configuration>(...entries: ConfigurationEntry<T>[]) {
  entries.forEach(([key, value]) => configurationSchema.parse({ key, value }))
  const operations = entries.map(([key, value]) => ({
    updateOne: { filter: { key }, update: { $set: { value } }, upsert: true },
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
  await collections.configuration.bulkWrite(operations as any)
  entries.forEach(([key]) => events.emit('configuration:updated', { key }))
}
