import { minutesToMilliseconds } from 'date-fns'
import { beforeEach, expect, it, vi } from 'vitest'
import { GameEventType } from '../../database/models/game-event.model'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { GameState, type GameModel, type GameNumber } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import autoSubstitutePlayersPlugin from './auto-substitute-players'

const configuration = vi.hoisted(() => new Map<string, unknown>())
vi.mock('../../configuration', () => ({
  configuration: { get: async (key: string) => configuration.get(key) },
}))

const mockSchedule = vi.hoisted(() => vi.fn())
const registeredTasks = vi.hoisted(
  () => new Map<string, (args: { gameNumber: GameNumber; player: SteamId64 }) => Promise<void>>(),
)
vi.mock('../../tasks', () => ({
  tasks: {
    register: (name: string, task: never) => registeredTasks.set(name, task),
    schedule: mockSchedule,
    cancel: vi.fn(),
  },
}))

vi.mock('../../events', () => ({ events: { on: vi.fn() } }))
vi.mock('../../utils/log-error', () => ({ logError: vi.fn() }))

const mockRequestSubstitute = vi.hoisted(() => vi.fn())
vi.mock('../lifecycle', () => ({
  gameLifecycle: { requestSubstitute: mockRequestSubstitute },
}))

const game = vi.hoisted(() => ({ current: undefined as unknown }))
vi.mock('../find-one', () => ({ findOne: async () => game.current }))

const mockSync = vi.hoisted(() => vi.fn())
vi.mock('../sync-player-connection-status', () => ({ syncPlayerConnectionStatus: mockSync }))

const player = 'FAKE_PLAYER' as SteamId64
const gameNumber = 1 as GameNumber

function startedGameWithOfflinePlayerLeftAt(at: Date): GameModel {
  return {
    number: gameNumber,
    state: GameState.started,
    slots: [
      { player, status: SlotStatus.active, connectionStatus: PlayerConnectionStatus.offline },
    ],
    events: [{ event: GameEventType.playerLeftGameServer, at, player }],
  } as unknown as GameModel
}

async function runTask() {
  await registeredTasks.get('games:autoSubstitutePlayer')!({ gameNumber, player })
}

beforeEach(async () => {
  vi.clearAllMocks()
  configuration.set('games.join_gameserver_timeout', minutesToMilliseconds(5))
  configuration.set('games.rejoin_gameserver_timeout', minutesToMilliseconds(3))
  await autoSubstitutePlayersPlugin()
})

it('does not request a substitute when the sync just marked the player offline', async () => {
  mockSync.mockImplementation(async () => {
    game.current = startedGameWithOfflinePlayerLeftAt(new Date())
  })

  await runTask()

  expect(mockRequestSubstitute).toHaveBeenCalledTimes(0)
})

it('re-schedules itself when it fires just before the rejoin deadline', async () => {
  mockSync.mockImplementation(async () => {
    game.current = startedGameWithOfflinePlayerLeftAt(
      new Date(Date.now() - minutesToMilliseconds(3) + 50),
    )
  })

  await runTask()

  expect(mockRequestSubstitute).toHaveBeenCalledTimes(0)
  expect(mockSchedule).toHaveBeenCalledWith('games:autoSubstitutePlayer', expect.any(Number), {
    gameNumber,
    player,
  })
  const delay = mockSchedule.mock.calls[0]![1] as number
  expect(delay).toBeGreaterThan(0)
  expect(delay).toBeLessThanOrEqual(50)
})

it('requests a substitute once the rejoin window has passed', async () => {
  mockSync.mockImplementation(async () => {
    game.current = startedGameWithOfflinePlayerLeftAt(
      new Date(Date.now() - minutesToMilliseconds(4)),
    )
  })

  await runTask()

  expect(mockRequestSubstitute).toHaveBeenCalledWith(
    expect.objectContaining({ number: gameNumber, replacee: player }),
  )
})
