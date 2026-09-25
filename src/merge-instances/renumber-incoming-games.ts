import type { GameModel, GameNumber } from '../database/models/game.model'
import type { GameNumberRemapModel } from '../database/models/game-number-remap.model'

// The primary keeps its numbers; incoming games continue its sequence, in their original order.
export function renumberIncomingGames(
  primaryGameNumbers: number[],
  incomingGames: GameModel[],
  sourceHost: string,
) {
  const maxPrimary = primaryGameNumbers.reduce((max, n) => Math.max(max, n), 0)
  const numberMap = new Map<number, GameNumber>()
  const remap: GameNumberRemapModel[] = []
  const games = [...incomingGames]
    .sort((a, b) => a.number - b.number)
    .map((game, index) => {
      const newNumber = (maxPrimary + index + 1) as GameNumber
      numberMap.set(game.number, newNumber)
      remap.push({ sourceHost, oldNumber: game.number, newNumber })
      return { ...game, number: newNumber }
    })
  return { games, remap, numberMap }
}
