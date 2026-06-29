import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../shared/current-gamemode', () => ({ currentGamemode: '6v6' }))

vi.mock('../logger', () => ({
  logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), trace: vi.fn(), warn: vi.fn() },
}))

vi.mock('../database/collections', () => ({
  collections: {
    games: { updateMany: vi.fn() },
    players: { find: vi.fn(), updateOne: vi.fn() },
  },
}))

import { collections } from '../database/collections'
import { up } from './024-multi-gamemode-backfill'
import { currentGamemode } from '../shared/current-gamemode'
import { Tf2ClassName } from '../shared/types/tf2-class-name'

const g0 = currentGamemode

function mockPlayers(players: unknown[]) {
  vi.mocked(collections.players.find).mockReturnValue({
    toArray: () => Promise.resolve(players),
  } as never)
}

describe('024-multi-gamemode-backfill', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(collections.games.updateMany).mockResolvedValue({ modifiedCount: 0 } as never)
    vi.mocked(collections.players.updateOne).mockResolvedValue({} as never)
  })

  it('tags untagged games with the current gamemode', async () => {
    mockPlayers([])
    await up()
    expect(collections.games.updateMany).toHaveBeenCalledWith(
      { gamemode: { $exists: false } },
      { $set: { gamemode: g0 } },
    )
  })

  it('nests flat skill and elo under the current gamemode', async () => {
    mockPlayers([
      {
        _id: 'p1',
        skill: { [Tf2ClassName.scout]: 3 },
        elo: { [Tf2ClassName.scout]: 1500 },
        stats: { totalGames: 5, gamesByClass: { [Tf2ClassName.scout]: 5 } },
      },
    ])
    await up()
    expect(collections.players.updateOne).toHaveBeenCalledWith(
      { _id: 'p1' },
      {
        $set: {
          skill: { [g0]: { [Tf2ClassName.scout]: 3 } },
          elo: { [g0]: { [Tf2ClassName.scout]: 1500 } },
          'stats.gamesByClass': { [g0]: { [Tf2ClassName.scout]: 5 } },
          'stats.gamesByGamemode': { [g0]: 5 },
        },
      },
    )
  })

  it('tags history entries with the current gamemode', async () => {
    mockPlayers([
      {
        _id: 'p2',
        eloHistory: [{ at: new Date(0), elo: { [Tf2ClassName.scout]: 1500 }, game: 1 }],
        skillHistory: [{ at: new Date(0), skill: { [Tf2ClassName.scout]: 3 }, actor: 'a' }],
        stats: { totalGames: 0, gamesByGamemode: {}, gamesByClass: {} },
      },
    ])
    await up()
    const call = vi.mocked(collections.players.updateOne).mock.calls[0]![1] as {
      $set: Record<string, unknown>
    }
    expect((call.$set['eloHistory'] as { gamemode: string }[])[0]!.gamemode).toBe(g0)
    expect((call.$set['skillHistory'] as { gamemode: string }[])[0]!.gamemode).toBe(g0)
  })

  it('is idempotent: skips already-nested players', async () => {
    mockPlayers([
      {
        _id: 'p3',
        skill: { [g0]: { [Tf2ClassName.scout]: 3 } },
        elo: { [g0]: { [Tf2ClassName.scout]: 1500 } },
        eloHistory: [{ at: new Date(0), gamemode: g0, elo: {}, game: 1 }],
        skillHistory: [{ at: new Date(0), gamemode: g0, skill: {}, actor: 'a' }],
        stats: { totalGames: 5, gamesByGamemode: { [g0]: 5 }, gamesByClass: { [g0]: {} } },
      },
    ])
    await up()
    expect(collections.players.updateOne).not.toHaveBeenCalled()
  })
})
