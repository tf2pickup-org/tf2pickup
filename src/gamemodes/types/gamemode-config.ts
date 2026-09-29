import type { GameClass } from './game-class'

export interface GamemodeConfig {
  /* Shown wherever players pick a gamemode, e.g. the games list filter */
  name: string

  /* Fits a badge, e.g. in the games list */
  shortName: string

  /* This is always 2 */
  teamCount: 2

  /* List of classes that play the given gamemode */
  classes: GameClass[]

  /* Whether teams are balanced by player skill; without it players have no skill in the gamemode */
  autoBalance: boolean
}
