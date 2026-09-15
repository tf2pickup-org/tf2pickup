import { isEqual } from 'es-toolkit'
import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'
import { events } from '../events'
import { get } from './get'
import { activityLog } from '../activity-log'
import type { SteamId64 } from '../shared/types/steam-id-64'
import type { Gamemode } from '../shared/types/gamemode'
import { resolveStorageKey } from './gamemode-scoped-keys'

export async function set<T extends keyof Configuration>(
  key: T,
  value: Configuration[T],
  actor: SteamId64 | 'bot',
  gamemode?: Gamemode,
): Promise<void> {
  configurationSchema.parse({ key, value })
  const storageKey = resolveStorageKey(key, gamemode)
  const oldValue = await get(key, gamemode)
  await collections.configuration.updateOne(
    { key: storageKey },
    { $set: { value } },
    { upsert: true },
  )

  if (!isEqual(oldValue, value)) {
    await activityLog.record({ type: 'configuration change', key, actor })
  }

  events.emit('configuration:updated', { key })
}
