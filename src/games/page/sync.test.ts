import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { WebSocket } from 'ws'
import type { AppWebSocket } from '../../websocket/types'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { GameState, type GameModel } from '../../database/models/game.model'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'
import { GameEventType } from '../../database/models/game-event.model'

vi.mock('../../logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('../../otel', () => ({
  meter: {
    createCounter: () => ({ add: vi.fn() }),
    createHistogram: () => ({ record: vi.fn() }),
  },
}))
vi.mock('../../players', () => ({
  players: {
    bySteamId: (steamId: string) =>
      Promise.resolve({ roles: steamId === '76561198000000009' ? ['admin'] : [] }),
  },
}))

// each view renders just the element it targets
vi.mock('../views/html/connect-info', () => ({
  ConnectInfo: () => '<div id="connect-info"></div>',
}))
vi.mock('../views/html/game-slot', () => ({
  GameSlot: (props: { slot: { id: string } }) => `<div id="game-slot-${props.slot.id}"></div>`,
}))
vi.mock('../views/html/game-state-indicator', () => ({
  GameStateIndicator: () => '<div id="game-state"></div>',
}))
vi.mock('../views/html/game-score', () => ({
  GameScore: (props: { team: string }) => `<div id="score-${props.team}"></div>`,
}))
vi.mock('../views/html/logs-link', () => ({ LogsLink: () => '<div id="logs-link"></div>' }))
vi.mock('../views/html/demo-link', () => ({ DemoLink: () => '<div id="demo-link"></div>' }))
vi.mock('../views/html/game-event-list', () => ({
  GameEventList: {
    append: (props: { event: { at: Date } }) =>
      `<div id="event-${props.event.at.getTime()}"></div>`,
  },
}))
vi.mock('../views/html/admin-toolbox', () => ({
  AdminToolbox: {
    rconConnect: () => '<div id="rcon-connect"></div>',
    gameControlButtons: () => '<div id="game-control-buttons"></div>',
  },
}))

import { Gateway } from '../../websocket/gateway'
import { gamePage } from '.'

const alice = '76561198000000001' as SteamId64
const bob = '76561198000000002' as SteamId64
const admin = '76561198000000009' as SteamId64

function game(overrides: Partial<GameModel> = {}): GameModel {
  return {
    number: 10,
    state: GameState.started,
    events: [],
    slots: [
      {
        id: 'blu-soldier-0',
        player: alice,
        status: SlotStatus.active,
        connectionStatus: PlayerConnectionStatus.offline,
      },
      {
        id: 'red-soldier-0',
        player: bob,
        status: SlotStatus.active,
        connectionStatus: PlayerConnectionStatus.offline,
      },
    ],
    ...overrides,
  } as unknown as GameModel
}

function withSlot(base: GameModel, index: number, change: object): GameModel {
  return { ...base, slots: base.slots.map((s, i) => (i === index ? { ...s, ...change } : s)) }
}

let clients: Set<AppWebSocket>
let gateway: Gateway

function connect(currentUrl: string, steamId?: SteamId64) {
  const socket = {
    readyState: WebSocket.OPEN,
    currentUrl,
    page: 1,
    send: vi.fn((_msg: string, cb?: (err?: Error) => void) => cb?.()),
    ...(steamId ? { player: { steamId } } : {}),
  } as unknown as AppWebSocket
  clients.add(socket)
  return socket
}

async function received(socket: AppWebSocket) {
  await new Promise(resolve => setImmediate(resolve))
  return vi
    .mocked(socket.send)
    .mock.calls.flatMap(([msg]) => [...String(msg).matchAll(/id="([^"]+)"/g)].map(m => m[1]))
}

beforeEach(() => {
  clients = new Set()
  gateway = new Gateway({ websocketServer: { clients } } as unknown as FastifyInstance)
})

describe('gamePage.sync', () => {
  it("re-renders everything that depends on the game's state", async () => {
    const viewer = connect('/games/10')
    const adminViewer = connect('/games/10', admin)
    const elsewhere = connect('/games/11')
    const before = game({ state: GameState.launching })

    gamePage.sync(gateway, before, { ...before, state: GameState.ended })

    const parts = [
      'game-state',
      'game-slot-blu-soldier-0',
      'game-slot-red-soldier-0',
      'connect-info',
    ]
    expect((await received(viewer)).sort()).toEqual([...parts].sort())
    expect((await received(adminViewer)).sort()).toEqual(
      [...parts, 'rcon-connect', 'game-control-buttons'].sort(),
    )
    expect(await received(elsewhere)).toEqual([])
  })

  it('re-renders the whole slot and its connect info on a connection status change', async () => {
    const aliceViewer = connect('/games/10', alice)
    const bobViewer = connect('/games/10', bob)
    const before = game()

    gamePage.sync(
      gateway,
      before,
      withSlot(before, 0, { connectionStatus: PlayerConnectionStatus.connected }),
    )

    expect(await received(aliceViewer)).toEqual(['game-slot-blu-soldier-0', 'connect-info'])
    expect(await received(bobViewer)).toEqual(['game-slot-blu-soldier-0'])
  })

  it('re-renders the connect info for the player whose slot changed only', async () => {
    const aliceViewer = connect('/games/10', alice)
    const bobViewer = connect('/games/10', bob)
    const before = game()

    gamePage.sync(gateway, before, withSlot(before, 0, { voiceServerUrl: 'mumble://example' }))

    expect(await received(aliceViewer)).toEqual(['connect-info'])
    expect(await received(bobViewer)).toEqual([])
  })

  it("does not re-render the connect info when a slot's shouldJoinBy is unchanged", async () => {
    const viewer = connect('/games/10', alice)
    const shouldJoinBy = new Date()
    const before = withSlot(game(), 0, { shouldJoinBy })

    gamePage.sync(gateway, before, withSlot(before, 0, { shouldJoinBy: new Date(shouldJoinBy) }))

    expect(await received(viewer)).toEqual([])
  })

  it('re-renders a slot whose player was replaced, and both players connect info', async () => {
    const replacement = '76561198000000003' as SteamId64
    const aliceViewer = connect('/games/10', alice)
    const replacementViewer = connect('/games/10', replacement)
    const before = game()

    gamePage.sync(gateway, before, withSlot(before, 0, { player: replacement }))

    expect(await received(aliceViewer)).toEqual(['game-slot-blu-soldier-0', 'connect-info'])
    expect(await received(replacementViewer)).toEqual(['game-slot-blu-soldier-0', 'connect-info'])
  })

  it('appends new events in order', async () => {
    const viewer = connect('/games/10')
    const before = game({
      events: [{ at: new Date(1), event: GameEventType.gameCreated }] as never,
    })

    gamePage.sync(gateway, before, {
      ...before,
      events: [
        ...before.events,
        { at: new Date(2), event: GameEventType.gameStarted },
        { at: new Date(3), event: GameEventType.gameEnded },
      ] as never,
    })

    expect(await received(viewer)).toEqual(['event-2', 'event-3'])
  })
})
