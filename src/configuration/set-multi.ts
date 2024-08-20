import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'

type ConfigurationEntry<T extends keyof Configuration> = [key: T, value: Configuration[T]]

export async function setMulti<T extends keyof Configuration>(...entries: ConfigurationEntry<T>[]) {
  entries.forEach(([key, value]) => configurationSchema.parse({ key, value }))
  await collections.configuration.bulkWrite(
    entries.map(([key, value]) => ({
      updateOne: {
        filter: { key },
        update: { value },
        upsert: true,
      },
    })),
  )
}
