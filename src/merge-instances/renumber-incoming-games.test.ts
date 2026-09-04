import { describe, expect, it } from 'vitest'
import { renumberIncomingGames } from './renumber-incoming-games'
import type { GameModel, GameNumber } from '../database/models/game.model'

function game(number: number): GameModel {
  return { number: number as GameNumber } as GameModel
}

describe('renumberIncomingGames()', () => {
  it('continues the primary sequence from its highest number', () => {
    const { games } = renumberIncomingGames([1, 2, 5], [game(1), game(2)], 'hl.tf2pickup.eu')
    expect(games.map(g => g.number)).toEqual([6, 7])
  })

  it('orders incoming games by their original number', () => {
    const { games } = renumberIncomingGames([10], [game(3), game(1), game(2)], 'src')
    // sorted by old number 1,2,3 → 11,12,13
    expect(games.map(g => g.number)).toEqual([11, 12, 13])
  })

  it('records a (sourceHost, oldNumber) → newNumber remap for every game', () => {
    const { remap } = renumberIncomingGames([4], [game(1), game(2)], 'hl.tf2pickup.eu')
    expect(remap).toEqual([
      { sourceHost: 'hl.tf2pickup.eu', oldNumber: 1, newNumber: 5 },
      { sourceHost: 'hl.tf2pickup.eu', oldNumber: 2, newNumber: 6 },
    ])
  })

  it('exposes an old→new map for rewriting foreign keys', () => {
    const { numberMap } = renumberIncomingGames([4], [game(1), game(2)], 'src')
    expect(numberMap.get(1)).toBe(5)
    expect(numberMap.get(2)).toBe(6)
  })

  it('starts at 1 when the primary has no games', () => {
    const { games } = renumberIncomingGames([], [game(7)], 'src')
    expect(games.map(g => g.number)).toEqual([1])
  })

  it('does not mutate the input games', () => {
    const incoming = game(1)
    renumberIncomingGames([9], [incoming], 'src')
    expect(incoming.number).toBe(1)
  })
})
