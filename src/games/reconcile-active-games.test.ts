import { beforeEach, expect, it, vi } from 'vitest'
import { reconcileActiveGames } from './reconcile-active-games'
import { setActiveGame } from './set-active-game'

const db = vi.hoisted(() => ({
  games: [] as unknown[],
  players: [] as unknown[],
  tasks: [] as unknown[],
}))
const mockPlayersFind = vi.hoisted(() => vi.fn())
vi.mock('../database/collections', () => ({
  collections: {
    games: { find: () => ({ toArray: async () => db.games }) },
    players: {
      find: mockPlayersFind.mockImplementation(() => ({ toArray: async () => db.players })),
    },
    tasks: { find: () => ({ toArray: async () => db.tasks }) },
  },
}))
vi.mock('./set-active-game', () => ({ setActiveGame: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  db.games = [{ number: 2, slots: [{ player: 'playing' }, { player: 'unseated' }] }]
  db.tasks = [{ name: 'games.freePlayer', args: { player: 'cooling-down' } }]
  db.players = [
    { steamId: 'playing', activeGame: 2 },
    { steamId: 'unseated' },
    { steamId: 'stuck', activeGame: 1 },
    { steamId: 'cooling-down', activeGame: 1 },
  ]
})

it('frees stuck players, seats unseated ones and leaves the rest alone', async () => {
  await reconcileActiveGames()

  expect(vi.mocked(setActiveGame).mock.calls).toEqual([
    ['unseated', 2],
    ['stuck', undefined],
  ])
})

it('looks only at players who are or should be in a game', async () => {
  await reconcileActiveGames()

  expect(mockPlayersFind).toHaveBeenCalledWith(
    { $or: [{ activeGame: { $exists: true } }, { steamId: { $in: ['playing', 'unseated'] } }] },
    { projection: { steamId: 1, activeGame: 1 } },
  )
})
