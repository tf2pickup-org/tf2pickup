import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'
import type { Gamemode } from '../shared/types/gamemode'
import { isInherited, resolveStorageKey } from './gamemode-scoped-keys'

export async function get<T extends keyof Configuration>(
  key: T,
  gamemode?: Gamemode,
): Promise<Configuration[T]> {
  const storageKey = resolveStorageKey(key, gamemode)
  const entry = await collections.configuration.findOne({ key: storageKey })
  if (entry) {
    return entry.value as Configuration[T]
  }

  // An inherited key with no per-gamemode override falls back to the global base.
  if (storageKey !== key && isInherited(key)) {
    const base = await collections.configuration.findOne({ key })
    if (base) {
      return base.value as Configuration[T]
    }
  }

  return configurationSchema.parse({ key }).value as Configuration[T]
}
