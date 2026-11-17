import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { GamemodeConfig } from '../types/gamemode-config'

export const _6v6: GamemodeConfig = {
  teamCount: 2,
  autoBalance: true,
  captainRoles: [
    { name: 'pocket', gameClass: Tf2ClassName.scout },
    { name: 'flank', gameClass: Tf2ClassName.scout },
    { name: 'pocket', gameClass: Tf2ClassName.soldier },
    { name: 'roamer', gameClass: Tf2ClassName.soldier },
    { name: 'demoman', gameClass: Tf2ClassName.demoman },
    { name: 'medic', gameClass: Tf2ClassName.medic },
  ],
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
