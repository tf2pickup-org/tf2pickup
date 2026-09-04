import type { GameModel, GameNumber } from '../database/models/game.model'
import type { GameNumberRemapModel } from '../database/models/game-number-remap.model'

export interface RenumberResult {
  // The incoming games, each carrying its new global number.
  games: GameModel[]
  // Remap rows to persist so legacy links keep resolving.
  remap: GameNumberRemapModel[]
  // old number → new number, for rewriting the incoming FK collections.
  numberMap: Map<number, GameNumber>
}

/**
 * Renumber only the incoming (merged-in) games so they continue the primary's
 * global sequence — the primary keeps its numbers, and each incoming game, in
 * original order, becomes max(primary)+1, +2, … A remap entry per game records
 * `(sourceHost, oldNumber) → newNumber` (ADR 0001). Pure.
 */
export function renumberIncomingGames(
  primaryGameNumbers: number[],
  incomingGames: GameModel[],
  sourceHost: string,
): RenumberResult {
  const maxPrimary = primaryGameNumbers.reduce((max, n) => Math.max(max, n), 0)
  const sorted = [...incomingGames].sort((a, b) => a.number - b.number)

  const remap: GameNumberRemapModel[] = []
  const numberMap = new Map<number, GameNumber>()
  const games = sorted.map((game, index) => {
    const newNumber = (maxPrimary + index + 1) as GameNumber
    remap.push({ sourceHost, oldNumber: game.number, newNumber })
    numberMap.set(game.number, newNumber)
    return { ...game, number: newNumber }
  })

  return { games, remap, numberMap }
}
