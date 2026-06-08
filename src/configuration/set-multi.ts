import { activityLog } from '../activity-log'
import { collections } from '../database/collections'
import {
  configurationSchema,
  type Configuration,
} from '../database/models/configuration-entry.model'
import { events } from '../events'
import type { SteamId64 } from '../shared/types/steam-id-64'

type ConfigurationEntry<T extends keyof Configuration> = [key: T, value: Configuration[T]]

export async function setMulti<T extends keyof Configuration>(
  actor: SteamId64,
  ...entries: ConfigurationEntry<T>[]
) {
  entries.forEach(([key, value]) => configurationSchema.parse({ key, value }))
  const operations = entries.map(([key, value]) => ({
    updateOne: { filter: { key }, update: { $set: { value } }, upsert: true },
  }))
  await collections.configuration.bulkWrite(
    operations as Parameters<typeof collections.configuration.bulkWrite>[0],
  )
  await Promise.all(
    entries.map(async ([key]) => {
      await activityLog.record({ type: 'configuration change', key, actor })
    }),
  )
  entries.forEach(([key]) => events.emit('configuration:updated', { key }))
}
