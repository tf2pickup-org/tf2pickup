import { _6v6 } from './6v6'
import { _9v9 } from './9v9'
import { ultiduo } from './ultiduo'
import type { QueueConfig } from '../../queue/types/queue-config'
import { environment } from '../../environment'

export const queueConfigs: Record<typeof environment.QUEUE_CONFIG, QueueConfig> = {
  '6v6': _6v6,
  '9v9': _9v9,
  ultiduo,
}
