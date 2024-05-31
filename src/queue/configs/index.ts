import { _6v6 } from './6v6'
import { test } from './test'
import { _9v9 } from './9v9'
import { bball } from './bball'
import { ultiduo } from './ultiduo'
import type { QueueConfig } from '../types/queue-config'
import { environment } from '../../environment'

export const queueConfigs: Record<typeof environment.QUEUE_CONFIG, QueueConfig> = {
  '6v6': _6v6,
  '9v9': _9v9,
  bball,
  test,
  ultiduo,
}
