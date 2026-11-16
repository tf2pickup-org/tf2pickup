import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { GameState, type GameModel } from '../../database/models/game.model'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

vi.mock('fastify-plugin', () => ({ default: <T>(fn: T): T => fn }))
vi.mock('../../events', () => ({ events: { on: vi.fn() } }))
vi.mock('../../players', () => ({ players: { bySteamId: vi.fn() } }))
vi.mock('../views/html/connect-info', () => ({ ConnectInfo: vi.fn().mockResolvedValue('') }))
vi.mock('../views/html/game-state-indicator', () => ({ GameStateIndicator: vi.fn() }))
vi.mock('../views/html/game-slot-list', () => ({ GameSlotList: { refreshAll: vi.fn() } }))
vi.mock('../views/html/admin-toolbox', () => ({
  AdminToolbox: { rconConnect: vi.fn(), gameControlButtons: vi.fn() },
}))
vi.mock('../views/html/game-score', () => ({ GameScore: vi.fn() }))
vi.mock('../views/html/logs-link', () => ({ LogsLink: vi.fn() }))
vi.mock('../views/html/demo-link', () => ({ DemoLink: vi.fn() }))
vi.mock('../views/html/game-event-list', () => ({ GameEventList: { append: vi.fn() } }))
vi.mock('../views/html/game-slot', () => ({ GameSlot: vi.fn() }))
vi.mock('../views/html/player-connection-status-indicator', () => ({
  PlayerConnectionStatusIndicator: vi.fn(),
}))
vi.mock('../views/html/server-ready-notification', () => ({ ServerReadyNotification: vi.fn() }))
vi.mock('../../html/components/games-link', () => ({ GamesLink: vi.fn() }))
vi.mock('../views/html/join-game-button', () => ({ JoinGameButton: vi.fn() }))
vi.mock('../views/html/join-voice-button', () => ({ JoinVoiceButton: vi.fn() }))

import { events } from '../../events'
import { ConnectInfo } from '../views/html/connect-info'
import { JoinGameButton } from '../views/html/join-game-button'
import { JoinVoiceButton } from '../views/html/join-voice-button'
import { PlayerConnectionStatusIndicator } from '../views/html/player-connection-status-indicator'
import plugin from './sync-clients'

const player = '76561198000000001' as SteamId64

function makeGame(overrides: Partial<GameModel>): GameModel {
  return {
    number: 10,
    state: GameState.ended,
    events: [],
    slots: [{ player }],
    ...overrides,
  } as unknown as GameModel
}

describe('games sync-clients', () => {
  let send: ReturnType<typeof vi.fn>
  let onGameUpdated: (params: { before: GameModel; after: GameModel }) => void
  let onConnectionStatusUpdated: (params: {
    game: GameModel
    player: SteamId64
    playerConnectionStatus: PlayerConnectionStatus
  }) => void

  beforeEach(async () => {
    vi.clearAllMocks()
    send = vi.fn()
    const to = vi.fn()
    to.mockReturnValue({ to, send })
    const app = { gateway: { to, broadcast: vi.fn() } } as unknown as FastifyInstance
    await (plugin as unknown as (app: FastifyInstance) => Promise<void>)(app)
    onGameUpdated = vi.mocked(events.on).mock.calls.find(([e]) => e === 'game:updated')![1] as never
    onConnectionStatusUpdated = vi
      .mocked(events.on)
      .mock.calls.find(([e]) => e === 'game:playerConnectionStatusUpdated')![1] as never
  })

  async function render() {
    for (const [fn] of send.mock.calls) {
      await (fn as (actor: SteamId64) => Promise<unknown>)(player)
    }
  }

  it.each([
    ['shouldJoinBy', { shouldJoinBy: new Date() }],
    ['voiceServerUrl', { voiceServerUrl: 'mumble://example' }],
  ])("re-renders the whole connect info when a slot's %s changes", async (_, change) => {
    onGameUpdated({
      before: makeGame({}),
      after: makeGame({ slots: [{ player, ...change }] as GameModel['slots'] }),
    })
    await render()

    expect(ConnectInfo).toHaveBeenCalled()
    expect(JoinGameButton).not.toHaveBeenCalled()
    expect(JoinVoiceButton).not.toHaveBeenCalled()
  })

  it("does not re-render the connect info when a slot's shouldJoinBy is unchanged", async () => {
    const shouldJoinBy = new Date()
    onGameUpdated({
      before: makeGame({
        state: GameState.started,
        slots: [{ player, shouldJoinBy }] as GameModel['slots'],
      }),
      after: makeGame({
        state: GameState.started,
        slots: [{ player, shouldJoinBy: new Date(shouldJoinBy) }] as GameModel['slots'],
      }),
    })
    await render()

    expect(ConnectInfo).not.toHaveBeenCalled()
  })

  it('re-renders the whole connect info when the connect string changes', async () => {
    onGameUpdated({
      before: makeGame({}),
      after: makeGame({ connectString: 'connect 127.0.0.1:27015' }),
    })
    await render()

    expect(ConnectInfo).toHaveBeenCalled()
    expect(JoinGameButton).not.toHaveBeenCalled()
  })

  it('keeps syncing later slots when an earlier slot has a new player', async () => {
    const replacement = '76561198000000002' as SteamId64
    const other = '76561198000000003' as SteamId64
    onGameUpdated({
      before: makeGame({ slots: [{ player }, { player: other }] as GameModel['slots'] }),
      after: makeGame({
        slots: [
          { player: replacement },
          { player: other, voiceServerUrl: 'mumble://example' },
        ] as GameModel['slots'],
      }),
    })
    await render()

    expect(ConnectInfo).toHaveBeenCalled()
  })

  describe('when a player connection status changes', () => {
    it.each([
      ['an active slot in a live game', SlotStatus.active, GameState.started, true],
      [
        'a slot waiting for a substitute',
        SlotStatus.waitingForSubstitute,
        GameState.started,
        false,
      ],
      ['an active slot in an ended game', SlotStatus.active, GameState.ended, false],
    ])('for %s', async (_, status, state, rendered) => {
      onConnectionStatusUpdated({
        game: makeGame({ state, slots: [{ player, status }] as GameModel['slots'] }),
        player,
        playerConnectionStatus: PlayerConnectionStatus.connected,
      })
      await render()

      expect(vi.mocked(PlayerConnectionStatusIndicator).mock.calls.length > 0).toBe(rendered)
      expect(ConnectInfo).toHaveBeenCalled()
    })
  })
})
