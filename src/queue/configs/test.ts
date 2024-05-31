import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { QueueConfig } from '../types/queue-config'

export const test: QueueConfig = {
  teamCount: 2,
  classes: [
    {
      name: Tf2ClassName.soldier,
      count: 1,
    },
  ],
}
