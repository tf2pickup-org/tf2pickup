import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { QueueConfig } from '../types/queue-config'

export const _6v6: QueueConfig = {
  teamCount: 2,
  classes: [
    {
      name: Tf2ClassName.scout,
      count: 2,
    },
    {
      name: Tf2ClassName.soldier,
      count: 2,
    },
    {
      name: Tf2ClassName.demoman,
      count: 1,
    },
    {
      name: Tf2ClassName.medic,
      count: 1,
      canMakeFriendsWith: [Tf2ClassName.scout, Tf2ClassName.soldier, Tf2ClassName.demoman],
    },
  ],
}
