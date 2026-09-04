import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'
import type { Gamemode } from '../shared/types/gamemode'
import { resolveStorageKey } from './gamemode-scoped-keys'

export async function get<T extends keyof Configuration>(
  key: T,
  gamemode?: Gamemode,
): Promise<Configuration[T]> {
  const storageKey = resolveStorageKey(key, gamemode)
  const entry = await collections.configuration.findOne({ key: storageKey })

  if (!entry) {
    return configurationSchema.parse({ key }).value as Configuration[T]
  }

  return entry.value as Configuration[T]
}
