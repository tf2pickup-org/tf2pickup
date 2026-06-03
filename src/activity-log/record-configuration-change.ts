import { configuration } from '../configuration'
import type { Configuration } from '../database/models/configuration-entry.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { recordActivity } from './record-activity'

export async function recordConfigurationChange<T extends keyof Configuration>(
  key: T,
  newValue: Configuration[T],
  actor: SteamId64,
): Promise<void> {
  const oldValue = await configuration.get(key)
  await configuration.set(key, newValue)
  if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
    await recordActivity({ type: 'configuration change', key, actor })
  }
}
