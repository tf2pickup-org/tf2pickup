import { collections } from '../database/collections'
import type { Configuration } from '../database/models/configuration-entry.model'
import { get } from './get'

export async function reset<T extends keyof Configuration>(key: T): Promise<Configuration[T]> {
  await collections.configuration.deleteOne({ key })
  return await get(key)
}
