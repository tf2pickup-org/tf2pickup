import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { GameState, type GameModel } from '../../database/models/game.model'
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

  beforeEach(async () => {
    vi.clearAllMocks()
    send = vi.fn()
    const to = vi.fn()
    to.mockReturnValue({ to, send })
    const app = { gateway: { to, broadcast: vi.fn() } } as unknown as FastifyInstance
    await (plugin as unknown as (app: FastifyInstance) => Promise<void>)(app)
    onGameUpdated = vi.mocked(events.on).mock.calls.find(([e]) => e === 'game:updated')![1] as never
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
})
