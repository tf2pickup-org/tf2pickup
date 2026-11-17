import type { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { GameClass } from './game-class'

export interface GamemodeConfig {
  /* This is always 2 */
  teamCount: 2

  /* List of classes that play the given gamemode */
  classes: GameClass[]

  /* Whether teams are balanced by player skill; without it players have no skill in the gamemode */
  autoBalance: boolean

  /* Roles players sign up for in a captain queue; each is needed once per team. Captain mode is allowed iff set */
  captainRoles?: { name: string; gameClass: Tf2ClassName }[]
}
