import { MongoServerError } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collections } from '../database/collections'
import type { GameModel } from '../database/models/game.model'
import { insertGame } from './insert-game'

vi.mock('../database/collections', () => ({
  collections: { games: { findOne: vi.fn(), insertOne: vi.fn() } },
}))

const game = { map: 'cp_process_f12' } as Omit<GameModel, 'number'>

function duplicate(keyPattern: object) {
  return Object.assign(new MongoServerError({ message: 'E11000' }), { code: 11000, keyPattern })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('insertGame()', () => {
  it('numbers the game after the highest number', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue({ number: 41 } as never)
    await insertGame(game)
    expect(collections.games.findOne).toHaveBeenCalledWith({}, { sort: { number: -1 } })
    expect(collections.games.insertOne).toHaveBeenCalledWith({ ...game, number: 42 })
  })

  it('numbers the first game 1', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue(null)
    await insertGame(game)
    expect(collections.games.insertOne).toHaveBeenCalledWith({ ...game, number: 1 })
  })

  it('retries when another launch took the number', async () => {
    vi.mocked(collections.games.findOne)
      .mockResolvedValueOnce({ number: 41 } as never)
      .mockResolvedValueOnce({ number: 42 } as never)
    vi.mocked(collections.games.insertOne).mockRejectedValueOnce(duplicate({ number: 1 }))
    await insertGame(game)
    expect(collections.games.insertOne).toHaveBeenLastCalledWith({ ...game, number: 43 })
  })

  it('rethrows other errors', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue(null)
    vi.mocked(collections.games.insertOne).mockRejectedValueOnce(duplicate({ _id: 1 }))
    await expect(insertGame(game)).rejects.toThrow('E11000')
  })
})
