import {
  configurationSchema,
  settingPages,
  type Configuration,
} from '../database/models/configuration-entry.model'
import type { QueueConfiguration, QueueModel } from '../database/models/queue.model'
import { gamemodeConfigs } from '../gamemodes/configs'

const queueTabs: Record<keyof QueueConfiguration, '' | '/timers' | null> = {
  name: '',
  skillThreshold: '',
  requireVerification: '',
  whitelistId: '',
  readyUpTimeout: '/timers',
  readyStateTimeout: '/timers',
  pickTimeout: '/timers',
  mapCooldown: null,
}

// keep in sync with what QueueSettingsPage shows for the queue
function isShownFor(
  queue: Pick<QueueModel, 'launchMode' | 'gamemode'>,
  field: keyof QueueConfiguration,
): boolean {
  switch (field) {
    case 'pickTimeout':
      return queue.launchMode === 'captain'
    case 'skillThreshold':
      return queue.launchMode === 'auto' && gamemodeConfigs[queue.gamemode].autoBalance
    default:
      return true
  }
}

export function settingPage(
  setting:
    | { configKey: keyof Configuration }
    | {
        queue: Pick<QueueModel, 'slug' | 'launchMode' | 'gamemode'>
        field: keyof QueueConfiguration
      },
): string | null {
  if ('configKey' in setting) {
    const option = configurationSchema.options.find(o => o.shape.key.value === setting.configKey)
    return (option && settingPages.get(option)?.page) ?? null
  }
  const { queue, field } = setting
  const tab = queueTabs[field]
  return tab === null || !isShownFor(queue, field) ? null : `/admin/queues/${queue.slug}${tab}`
}
