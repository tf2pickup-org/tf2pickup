import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { GamemodeConfig } from '../types/gamemode-config'

export const _4v4: GamemodeConfig = {
  teamCount: 2,
  autoBalance: true,
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
