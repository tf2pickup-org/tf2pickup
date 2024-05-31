import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { QueueConfig } from '../types/queue-config'

export const ultiduo: QueueConfig = {
  teamCount: 2,
  classes: [
    {
      name: Tf2ClassName.soldier,
      count: 1,
    },
    {
      name: Tf2ClassName.medic,
      count: 1,
    },
  ],
}
