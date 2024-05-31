import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'

export async function get<T extends keyof Configuration>(key: T): Promise<Configuration[T]> {
  const entry = await collections.configuration.findOne({ key })

  if (!entry) {
    return configurationSchema.parse({ key }).value as Configuration[T]
  }

  return entry.value as Configuration[T]
}
