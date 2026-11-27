import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AppWebSocket } from '../../websocket/types'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { GameState, type GameModel } from '../../database/models/game.model'
import { PlayerConnectionStatus, SlotStatus } from '../../database/models/game-slot.model'

const findOne = vi.hoisted(() => vi.fn())
vi.mock('../../database/collections', () => ({ collections: { games: { findOne } } }))
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
    replace: (props: { game: GameModel }) =>
      `<div id="event-list-${props.game.events.length}"></div>`,
  },
}))
vi.mock('../views/html/admin-toolbox', () => ({
  AdminToolbox: {
    rconConnect: () => '<div id="rcon-connect"></div>',
    gameControlButtons: () => '<div id="game-control-buttons"></div>',
  },
}))

import { render } from './render'

const admin = '76561198000000009' as SteamId64

const game = {
  number: 10,
  state: GameState.started,
  events: [{}, {}, {}],
  slots: [
    {
      id: 'blu-soldier-0',
      player: '76561198000000001',
      status: SlotStatus.active,
      connectionStatus: PlayerConnectionStatus.offline,
    },
    {
      id: 'red-soldier-0',
      player: '76561198000000002',
      status: SlotStatus.active,
      connectionStatus: PlayerConnectionStatus.offline,
    },
  ],
} as unknown as GameModel

function connect(currentUrl: string, steamId?: SteamId64) {
  return {
    currentUrl,
    page: 1,
    send: vi.fn(),
    ...(steamId ? { player: { steamId } } : {}),
  } as unknown as AppWebSocket
}

function received(socket: AppWebSocket) {
  return vi.mocked(socket.send).mock.calls.map(([msg]) => String(msg))
}

const parts = [
  'game-state',
  'score-blu',
  'score-red',
  'logs-link',
  'demo-link',
  'game-slot-blu-soldier-0',
  'game-slot-red-soldier-0',
  'connect-info',
  'event-list-3',
]

beforeEach(() => {
  findOne.mockReset()
  findOne.mockImplementation(({ number }: { number: number }) =>
    Promise.resolve(number === game.number ? game : null),
  )
})

describe('gamePage.render', () => {
  it('sends every live part of the game page, tagged for the page', async () => {
    const socket = connect('/games/10')

    await render(socket)

    expect(findOne).toHaveBeenCalledWith({ number: 10 })
    expect(received(socket)).toEqual(parts.map(id => `<!--page:1--><div id="${id}"></div>`))
  })

  it('sends the admin toolbox to admins', async () => {
    const socket = connect('/games/10', admin)

    await render(socket)

    expect(received(socket).map(msg => /id="([^"]+)"/.exec(msg)?.[1])).toEqual([
      ...parts.slice(0, -1),
      'rcon-connect',
      'game-control-buttons',
      'event-list-3',
    ])
  })

  it.each(['/', '/q/6v6', '/games', '/games/10/og-image.png'])('sends nothing on %s', async url => {
    const socket = connect(url)

    await render(socket)

    expect(findOne).not.toHaveBeenCalled()
    expect(received(socket)).toEqual([])
  })

  it('sends nothing for an unknown game', async () => {
    const socket = connect('/games/11')

    await render(socket)

    expect(received(socket)).toEqual([])
  })
})
