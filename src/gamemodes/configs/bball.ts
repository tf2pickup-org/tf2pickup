import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { GamemodeConfig } from '../types/gamemode-config'

export const bball: GamemodeConfig = {
  teamCount: 2,
  classes: [
    {
      name: Tf2ClassName.soldier,
      count: 2,
    },
  ],
}
