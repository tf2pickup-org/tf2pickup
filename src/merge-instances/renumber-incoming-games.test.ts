import { describe, expect, it } from 'vitest'
import type { GameModel } from '../database/models/game.model'
import { renumberIncomingGames } from './renumber-incoming-games'

const game = (number: number) => ({ number, map: `map${number}` }) as unknown as GameModel

describe('renumberIncomingGames()', () => {
  it('continues the primary sequence, in the incoming order', () => {
    const { games, remap, numberMap } = renumberIncomingGames(
      [1, 2, 5],
      [game(2), game(1)],
      'hl.test',
    )
    expect(games.map(({ number, map }) => [number, map])).toEqual([
      [6, 'map1'],
      [7, 'map2'],
    ])
    expect(remap).toEqual([
      { sourceHost: 'hl.test', oldNumber: 1, newNumber: 6 },
      { sourceHost: 'hl.test', oldNumber: 2, newNumber: 7 },
    ])
    expect(numberMap.get(2)).toBe(7)
  })

  it('starts at 1 on an empty primary', () => {
    expect(renumberIncomingGames([], [game(10)], 'hl.test').games[0]!.number).toBe(1)
  })
})
