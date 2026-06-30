import { describe, expect, it } from 'vitest'
import { legacyKey, renumberGames } from './renumber-games'
import type { GameModel, GameNumber } from '../database/models/game.model'
import { Gamemode } from '../shared/types/gamemode'

function game(number: number, gamemode: Gamemode, launchedAt: string): GameModel {
  return {
    number: number as GameNumber,
    gamemode,
    events: [{ at: new Date(launchedAt) }],
  } as unknown as GameModel
}

describe('renumberGames', () => {
  it('re-sequences games from both instances by launch date', () => {
    const { games } = renumberGames([
      game(1, Gamemode.sixes, '2020-01-01'),
      game(2, Gamemode.sixes, '2020-03-01'),
      game(1, Gamemode.highlander, '2020-02-01'),
    ])

    expect(games.map(g => g.number)).toEqual([1, 2, 3])
    expect(games.map(g => g.gamemode)).toEqual([
      Gamemode.sixes,
      Gamemode.highlander,
      Gamemode.sixes,
    ])
  })

  it('records the original gamemode + number in legacy', () => {
    const { games } = renumberGames([
      game(7, Gamemode.sixes, '2020-01-01'),
      game(7, Gamemode.highlander, '2020-02-01'),
    ])

    expect(games[0]!.legacy).toEqual({ gamemode: Gamemode.sixes, number: 7 })
    expect(games[1]!.legacy).toEqual({ gamemode: Gamemode.highlander, number: 7 })
  })

  it('returns a remap keyed by gamemode + old number', () => {
    const { remap } = renumberGames([
      game(5, Gamemode.sixes, '2020-01-01'),
      game(5, Gamemode.highlander, '2020-02-01'),
    ])

    expect(remap.get(legacyKey(Gamemode.sixes, 5))).toBe(1)
    expect(remap.get(legacyKey(Gamemode.highlander, 5))).toBe(2)
  })

  it('preserves an existing legacy mapping on re-merge', () => {
    const already = {
      ...game(1, Gamemode.sixes, '2020-01-01'),
      legacy: { gamemode: Gamemode.sixes, number: 42 as GameNumber },
    }
    const { games, remap } = renumberGames([already])

    expect(games[0]!.legacy).toEqual({ gamemode: Gamemode.sixes, number: 42 })
    expect(remap.get(legacyKey(Gamemode.sixes, 42))).toBe(1)
  })
})
