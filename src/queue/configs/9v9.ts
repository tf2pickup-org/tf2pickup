import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { QueueConfig } from '../types/queue-config'

export const _9v9: QueueConfig = {
  teamCount: 2,
  classes: [
    {
      name: Tf2ClassName.scout,
      count: 1,
    },
    {
      name: Tf2ClassName.soldier,
      count: 1,
    },
    {
      name: Tf2ClassName.pyro,
      count: 1,
    },
    {
      name: Tf2ClassName.demoman,
      count: 1,
    },
    {
      name: Tf2ClassName.heavy,
      count: 1,
    },
    {
      name: Tf2ClassName.engineer,
      count: 1,
    },
    {
      name: Tf2ClassName.medic,
      count: 1,
      canMakeFriendsWith: [
        Tf2ClassName.scout,
        Tf2ClassName.soldier,
        Tf2ClassName.pyro,
        Tf2ClassName.demoman,
        Tf2ClassName.heavy,
        Tf2ClassName.engineer,
        Tf2ClassName.sniper,
        Tf2ClassName.spy,
      ],
    },
    {
      name: Tf2ClassName.sniper,
      count: 1,
    },
    {
      name: Tf2ClassName.spy,
      count: 1,
    },
  ],
}
