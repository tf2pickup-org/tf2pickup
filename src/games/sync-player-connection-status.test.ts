import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../database/collections', () => ({
  collections: {
    games: {
      find: vi.fn(),
    },
  },
}))

vi.mock('./rcon/with-rcon', () => ({
  withRcon: vi.fn(),
}))

vi.mock('./rcon/parse-status', () => ({
  parseStatus: vi.fn(),
}))

vi.mock('./update', () => ({
  update: vi.fn(),
}))

vi.mock('../events', () => ({
  events: {
    emit: vi.fn(),
  },
}))

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import { collections } from '../database/collections'
import { events } from '../events'
import { PlayerConnectionStatus } from '../database/models/game-slot.model'
import { GameState, type GameModel } from '../database/models/game.model'
import type { SteamId64 } from '../shared/types/steam-id-64'
import { parseStatus } from './rcon/parse-status'
import { withRcon, type Rcon } from './rcon/with-rcon'
import { update } from './update'
import { syncPlayerConnectionStatus } from './sync-player-connection-status'

const present = '76561100000000001' as SteamId64
const absent = '76561100000000002' as SteamId64

function fakeGame(): GameModel {
  return {
    number: 42,
    state: GameState.started,
    gameServer: { id: 'gs' },
    slots: [
      // present on server but marked offline -> should be synced to connected
      { player: present, connectionStatus: PlayerConnectionStatus.offline },
      // absent from server but marked connected -> should be synced to offline
      { player: absent, connectionStatus: PlayerConnectionStatus.connected },
    ],
  } as unknown as GameModel
}

describe('syncPlayerConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(collections.games.find).mockReturnValue({
      toArray: () => Promise.resolve([fakeGame()]),
    } as never)
    vi.mocked(withRcon).mockImplementation(
      async (_game: GameModel, callback: (args: { rcon: Rcon }) => Promise<unknown>) =>
        callback({ rcon: { send: vi.fn().mockResolvedValue('status output') } }),
    )
    vi.mocked(parseStatus).mockReturnValue([{ name: 'present', steamId: present }])
    vi.mocked(update).mockImplementation(async () => fakeGame())
  })

  it('marks a present-but-offline player as connected', async () => {
    await syncPlayerConnectionStatus()

    expect(update).toHaveBeenCalledWith(
      42,
      { $set: { 'slots.$[element].connectionStatus': PlayerConnectionStatus.connected } },
      { arrayFilters: [{ 'element.player': { $eq: present } }] },
    )
    expect(events.emit).toHaveBeenCalledWith('game:playerConnectionStatusUpdated', {
      game: expect.anything(),
      player: present,
      playerConnectionStatus: PlayerConnectionStatus.connected,
    })
  })

  it('marks an absent-but-connected player as offline', async () => {
    await syncPlayerConnectionStatus()

    expect(update).toHaveBeenCalledWith(
      42,
      { $set: { 'slots.$[element].connectionStatus': PlayerConnectionStatus.offline } },
      { arrayFilters: [{ 'element.player': { $eq: absent } }] },
    )
    expect(events.emit).toHaveBeenCalledWith('game:playerConnectionStatusUpdated', {
      game: expect.anything(),
      player: absent,
      playerConnectionStatus: PlayerConnectionStatus.offline,
    })
  })

  it('does not touch slots that are already in sync', async () => {
    vi.mocked(collections.games.find).mockReturnValue({
      toArray: () =>
        Promise.resolve([
          {
            ...fakeGame(),
            slots: [
              { player: present, connectionStatus: PlayerConnectionStatus.connected },
              { player: absent, connectionStatus: PlayerConnectionStatus.offline },
            ],
          } as unknown as GameModel,
        ]),
    } as never)

    await syncPlayerConnectionStatus()

    expect(update).not.toHaveBeenCalled()
    expect(events.emit).not.toHaveBeenCalled()
  })
})
