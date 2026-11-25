import { MongoServerError } from 'mongodb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { collections } from '../database/collections'
import type { GameModel } from '../database/models/game.model'
import { insertGame } from './insert-game'

vi.mock('../database/collections', () => ({
  collections: { games: { findOne: vi.fn(), insertOne: vi.fn() } },
}))

const game = { map: 'cp_process_f12', launchToken: 'launch-token' } as Omit<GameModel, 'number'> & {
  launchToken: string
}

function duplicate(keyPattern: object) {
  return Object.assign(new MongoServerError({ message: 'E11000' }), { code: 11000, keyPattern })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(collections.games.insertOne).mockResolvedValue({ insertedId: 'id' } as never)
})

function given(...found: unknown[]) {
  for (const doc of found) vi.mocked(collections.games.findOne).mockResolvedValueOnce(doc as never)
}

describe('insertGame()', () => {
  it('numbers the game after the highest number', async () => {
    given(null, { number: 41 }, { number: 42 })
    expect(await insertGame(game)).toEqual({ game: { number: 42 }, inserted: true })
    expect(collections.games.findOne).toHaveBeenCalledWith({}, { sort: { number: -1 } })
    expect(collections.games.insertOne).toHaveBeenCalledWith({ ...game, number: 42 })
  })

  it('numbers the first game 1', async () => {
    given(null, null, { number: 1 })
    await insertGame(game)
    expect(collections.games.insertOne).toHaveBeenCalledWith({ ...game, number: 1 })
  })

  it('retries when another launch took the number', async () => {
    given(null, { number: 41 }, { number: 42 }, { number: 43 })
    vi.mocked(collections.games.insertOne).mockRejectedValueOnce(duplicate({ number: 1 }))
    await insertGame(game)
    expect(collections.games.insertOne).toHaveBeenLastCalledWith({ ...game, number: 43 })
  })

  it('returns the game a replayed launch already created', async () => {
    const existing = { number: 7 }
    given(existing)
    expect(await insertGame(game)).toEqual({ game: existing, inserted: false })
    expect(collections.games.findOne).toHaveBeenCalledWith({ launchToken: 'launch-token' })
    expect(collections.games.insertOne).not.toHaveBeenCalled()
  })

  it('returns the game a concurrent launch with the same token inserted first', async () => {
    const raced = { number: 42 }
    given(null, { number: 41 }, raced)
    vi.mocked(collections.games.insertOne).mockRejectedValueOnce(duplicate({ launchToken: 1 }))
    expect(await insertGame(game)).toEqual({ game: raced, inserted: false })
  })

  it('rethrows other errors', async () => {
    vi.mocked(collections.games.findOne).mockResolvedValue(null)
    vi.mocked(collections.games.insertOne).mockRejectedValueOnce(duplicate({ _id: 1 }))
    await expect(insertGame(game)).rejects.toThrow('E11000')
  })
})
