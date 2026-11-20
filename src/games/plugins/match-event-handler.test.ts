import { describe, it, expect, vi, beforeEach } from 'vitest'
import { events } from '../../events'
import { gameLifecycle } from '../lifecycle'
import { update } from '../update'
import { PlayerConnectionStatus } from '../../database/models/game-slot.model'
import { GameEventType } from '../../database/models/game-event.model'
import type { GameNumber } from '../../database/models/game.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2Team } from '../../shared/types/tf2-team'
import plugin from './match-event-handler'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

vi.mock('../../events', () => ({
  events: { on: vi.fn() },
}))

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

vi.mock('../update', () => ({ update: vi.fn() }))

vi.mock('../lifecycle', () => ({
  gameLifecycle: {
    start: vi.fn(),
    restart: vi.fn(),
    end: vi.fn(),
    setConnection: vi.fn(),
  },
}))

const gameNumber = 7615 as GameNumber
const steamId = 'PLAYER' as SteamId64

function handler(event: string) {
  const call = vi.mocked(events.on).mock.calls.find(([e]) => e === event)
  return call![1] as (params: Record<string, unknown>) => Promise<void>
}

describe('match-event-handler', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await (plugin as unknown as () => Promise<void>)()
  })

  it.each([
    ['match:started', gameLifecycle.start],
    ['match/score:reset', gameLifecycle.restart],
    ['match:ended', gameLifecycle.end],
  ])('hands %s to the game lifecycle', async (event, transition) => {
    await handler(event)({ gameNumber })
    expect(transition).toHaveBeenCalledWith(gameNumber)
  })

  it.each([
    [
      'match/player:connected',
      PlayerConnectionStatus.joining,
      { event: GameEventType.playerJoinedGameServer, player: steamId },
    ],
    [
      'match/player:joinedTeam',
      PlayerConnectionStatus.connected,
      { event: GameEventType.playerJoinedGameServerTeam, player: steamId, team: Tf2Team.blu },
    ],
    [
      'match/player:disconnected',
      PlayerConnectionStatus.offline,
      { event: GameEventType.playerLeftGameServer, player: steamId },
    ],
  ])('records %s as a connection status change', async (event, status, logEntry) => {
    await handler(event)({ gameNumber, steamId, team: Tf2Team.blu })
    expect(gameLifecycle.setConnection).toHaveBeenCalledWith(
      gameNumber,
      steamId,
      status,
      expect.objectContaining(logEntry),
    )
  })

  it('stores the logs url even after the game has ended', async () => {
    await handler('match/logs:uploaded')({ gameNumber, logsUrl: 'https://logs.tf/1' })
    expect(update).toHaveBeenCalledWith(gameNumber, { $set: { logsUrl: 'https://logs.tf/1' } })
  })
})
