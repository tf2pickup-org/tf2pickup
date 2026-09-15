import type { GameNumber } from './game.model'

// One entry per game imported from a merged-in instance: the game's number on
// that instance (`oldNumber`, unique only within `sourceHost`) and the global
// number it was renumbered to on this instance. Legacy links to the merged-in
// instance resolve through here — see ADR 0001.
export interface GameNumberRemapModel {
  sourceHost: string
  oldNumber: GameNumber
  newNumber: GameNumber
}
