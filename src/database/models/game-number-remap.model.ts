import type { GameNumber } from './game.model'

// A game merged in from another instance: its number there (unique only within sourceHost) and
// the number it got here. Old links to that instance resolve through it; see ADR 0001.
export interface GameNumberRemapModel {
  sourceHost: string
  oldNumber: GameNumber
  newNumber: GameNumber
}
