import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { WebSocket } from 'ws'
import { ObjectId } from 'mongodb'
import type { AppWebSocket } from '../../websocket/types'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { QueueState } from '../../database/models/queue-state.model'

const db = vi.hoisted(() => ({
  queues: [] as { _id: unknown; slug: string; gamemode: string; enabled: boolean }[],
  slots: [] as {
    id: string
    queue: unknown
    player: { steamId: string } | null
    ready?: boolean
  }[],
  players: [] as { steamId: string; activeGame?: number }[],
  mapOptions: [] as { queue: unknown; name: string }[],
  state: 'waiting',
}))

// each view renders just the element it targets
const tag = vi.hoisted(
  () =>
    (id: string) =>
    (props: { actor?: unknown } = {}) =>
      `<div id="${id}" data-actor="${JSON.stringify(props.actor ?? null).replaceAll('"', "'")}"></div>`,
)

vi.mock('../../logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('../../otel', () => ({
  meter: {
    createCounter: () => ({ add: vi.fn() }),
    createHistogram: () => ({ record: vi.fn() }),
  },
}))
vi.mock('../../configuration', () => ({
  configuration: { get: vi.fn().mockResolvedValue({ '6v6': { soldier: 2 } }) },
}))
vi.mock('../get-state', () => ({ getState: () => Promise.resolve(db.state) }))
vi.mock('../index', () => ({
  queues: {
    listEnabled: () => Promise.resolve(db.queues),
    queuePageUrl: (slug: string) => `/q/${slug}`,
  },
}))
vi.mock('../../database/collections', () => {
  const matches = (doc: Record<string, unknown>, filter: Record<string, unknown>) =>
    Object.entries(filter).every(([key, expected]) => {
      const actual: unknown = key
        .split('.')
        .reduce<unknown>((value, k) => (value as Record<string, unknown> | null)?.[k], doc)
      if (expected && typeof expected === 'object' && '$ne' in expected) {
        return actual !== expected.$ne
      }
      if (expected && typeof expected === 'object' && '$in' in expected) {
        return (expected.$in as unknown[]).includes(actual)
      }
      if (expected && typeof expected === 'object' && '$eq' in expected) {
        return actual === expected.$eq
      }
      return actual === expected
    })
  const collection = (docs: () => Record<string, unknown>[]) => ({
    find: (filter: Record<string, unknown> = {}) => ({
      toArray: () => Promise.resolve(docs().filter(doc => matches(doc, filter))),
    }),
    findOne: (filter: Record<string, unknown>) =>
      Promise.resolve(docs().find(doc => matches(doc, filter)) ?? null),
    countDocuments: (filter: Record<string, unknown>) =>
      Promise.resolve(docs().filter(doc => matches(doc, filter)).length),
  })
  return {
    collections: {
      queues: collection(() => db.queues),
      queueSlots: collection(() => db.slots),
      players: collection(() => db.players),
      queueMapOptions: collection(() => db.mapOptions),
    },
  }
})

vi.mock('../auto/views/html/queue-slot', () => ({
  QueueSlot: (props: { slot: { id: string }; actor?: { steamId: string } }) =>
    tag(`queue-slot-${props.slot.id}`)({ actor: props.actor?.steamId }),
}))
vi.mock('../auto/views/html/set-title', () => ({ SetTitle: () => tag('set-title')() }))
vi.mock('../auto/views/html/is-in-queue', () => ({ IsInQueue: tag('is-in-queue') }))
vi.mock('../auto/views/html/map-vote-selection', () => ({
  MapVoteSelection: tag('map-vote-selection'),
}))
vi.mock('../auto/views/html/map-vote', () => ({
  MapVote: tag('map-vote'),
  MapResult: (props: { map: string }) => tag(`map-result-${props.map}`)(),
}))
vi.mock('../auto/views/html/online-player-list', () => ({
  OnlinePlayerList: () => tag('online-player-list')(),
}))
vi.mock('../auto/views/html/online-player-count', () => ({
  OnlinePlayerCount: () => tag('online-player-count')(),
}))
vi.mock('../auto/views/html/stream-list', () => ({ StreamList: () => tag('stream-list')() }))
vi.mock('../auto/views/html/substitution-requests', () => ({
  SubstitutionRequests: () => tag('substitution-requests')(),
}))
vi.mock('../auto/views/html/chat', () => ({
  ChatMessages: Object.assign(() => tag('chat-messages')(), {
    append: () => tag('chat-message')(),
    remove: () => tag('chat-message-removed')(),
  }),
}))
vi.mock('../auto/views/html/ban-alerts', () => ({ BanAlerts: tag('ban-alerts') }))
vi.mock('../../pre-ready/views/html/pre-ready-up-button', () => ({
  PreReadyUpButton: tag('pre-ready-up-button'),
}))
vi.mock('../auto/views/html/ready-up-dialog', () => ({
  ReadyUpDialog: { show: () => tag('ready-up-dialog')() },
}))

import { Gateway } from '../../websocket/gateway'
import { queuePage } from '.'

const alice = '76561198000000001' as SteamId64
const bob = '76561198000000002' as SteamId64
const sixes = { _id: new ObjectId(), slug: '6v6', gamemode: '6v6', enabled: true }
const ultiduo = { _id: new ObjectId(), slug: 'ultiduo', gamemode: 'ultiduo', enabled: true }

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

// element ids the socket received, in order
async function received(socket: AppWebSocket) {
  await new Promise(resolve => setImmediate(resolve))
  return vi
    .mocked(socket.send)
    .mock.calls.flatMap(([msg]) => [...String(msg).matchAll(/id="([^"]+)"/g)].map(m => m[1]))
}

let clients: Set<AppWebSocket>
let gateway: Gateway

beforeEach(() => {
  clients = new Set()
  gateway = new Gateway({ websocketServer: { clients } } as unknown as FastifyInstance)
  db.queues = [sixes]
  db.slots = [
    { id: 'soldier-0', queue: sixes._id, player: { steamId: alice } },
    { id: 'soldier-1', queue: sixes._id, player: null },
    { id: 'soldier-0', queue: ultiduo._id, player: null },
  ]
  db.players = [{ steamId: alice }, { steamId: bob }]
  db.mapOptions = [
    { queue: sixes._id, name: 'cp_badlands' },
    { queue: sixes._id, name: 'cp_process' },
  ]
  db.state = QueueState.waiting
})

describe('queuePage.update', () => {
  it("sends a queue's parts to its own page only", async () => {
    db.queues = [sixes, ultiduo]
    const onSixes = connect('/q/6v6')
    const onUltiduo = connect('/q/ultiduo')
    const onGame = connect('/games/1')

    await queuePage.update(gateway, sixes._id as never, { slots: 'all' })

    expect(await received(onSixes)).toEqual(['queue-slot-soldier-0', 'queue-slot-soldier-1'])
    expect(await received(onUltiduo)).toEqual([])
    expect(await received(onGame)).toEqual([])
  })

  it('renders each slot for the player viewing it', async () => {
    const aliceSocket = connect('/q/6v6', alice)
    const bobSocket = connect('/q/6v6', bob)

    await queuePage.update(gateway, sixes._id as never, { friends: [alice] })

    await received(aliceSocket)
    const [aliceMsg] = vi.mocked(aliceSocket.send).mock.calls
    const [bobMsg] = vi.mocked(bobSocket.send).mock.calls
    expect(String(aliceMsg?.[0])).toContain(`data-actor="'${alice}'"`)
    expect(String(bobMsg?.[0])).toContain(`data-actor="'${bob}'"`)
  })

  it('leaves the switcher count out while only one queue is enabled', async () => {
    const socket = connect('/q/6v6')

    await queuePage.update(gateway, sixes._id as never, { counts: true })

    expect(await received(socket)).not.toContain('queue-switcher-count-6v6')
  })

  it("sends a queue's switcher count to every queue page", async () => {
    db.queues = [sixes, ultiduo]
    const onUltiduo = connect('/q/ultiduo')

    await queuePage.update(gateway, sixes._id as never, { counts: true })

    expect(await received(onUltiduo)).toEqual(['queue-switcher-count-6v6'])
  })

  it('sends the map results for every map option', async () => {
    const socket = connect('/q/6v6')

    await queuePage.update(gateway, sixes._id as never, { mapResults: { cp_badlands: 1 } })

    expect(await received(socket)).toEqual(['map-result-cp_badlands', 'map-result-cp_process'])
  })
})

describe('queuePage.updateAll', () => {
  it('sends shared parts to every queue page', async () => {
    db.queues = [sixes, ultiduo]
    const onSixes = connect('/q/6v6')
    const onUltiduo = connect('/q/ultiduo')
    const onGame = connect('/games/1')

    await queuePage.updateAll(gateway, { onlinePlayers: true })

    expect(await received(onSixes)).toEqual(['online-player-count', 'online-player-list'])
    expect(await received(onUltiduo)).toEqual(['online-player-count', 'online-player-list'])
    expect(await received(onGame)).toEqual([])
  })

  it('sends the chat to signed-in players only', async () => {
    const anonymous = connect('/q/6v6')
    const signedIn = connect('/q/6v6', alice)

    await queuePage.updateAll(gateway, { chat: { remove: 'id' } })

    expect(await received(anonymous)).toEqual([])
    expect(await received(signedIn)).toEqual(['chat-message-removed'])
  })

  it("sends queue parts to each queue's page, for the given players", async () => {
    db.queues = [sixes, ultiduo]
    const aliceOnUltiduo = connect('/q/ultiduo', alice)
    const bobOnUltiduo = connect('/q/ultiduo', bob)

    await queuePage.updateAll(gateway, { banAlerts: true, slots: 'all' }, { players: [alice] })

    expect(await received(aliceOnUltiduo)).toEqual(['ban-alerts', 'queue-slot-soldier-0'])
    expect(await received(bobOnUltiduo)).toEqual([])
  })
})

describe('queuePage.render', () => {
  it('brings a client that opened a queue page up to date', async () => {
    const socket = connect('/q/6v6', alice)

    await queuePage.render(socket)

    expect(await received(socket)).toEqual([
      'queue-slot-soldier-0',
      'queue-slot-soldier-1',
      'queue-current-player-count',
      'set-title',
      'is-in-queue',
      'substitution-requests',
      'online-player-count',
      'online-player-list',
      'stream-list',
      'chat-messages',
      'running-game-snackbar',
      'pre-ready-up-button',
      'ban-alerts',
    ])
  })

  it("keeps the shared part when switching from another queue's page", async () => {
    db.queues = [sixes, ultiduo]
    const socket = connect('/q/6v6')

    await queuePage.render(socket, '/q/ultiduo')

    expect(await received(socket)).not.toContain('online-player-list')
  })

  it('shows the ready-up dialog to a player who has not readied up', async () => {
    db.state = QueueState.ready
    db.slots[0]!.ready = false
    const socket = connect('/q/6v6', alice)

    await queuePage.render(socket)

    expect(await received(socket)).toContain('ready-up-dialog')
  })

  it('tags its updates with the page they were rendered for', async () => {
    const socket = connect('/q/6v6')

    const rendering = queuePage.render(socket)
    socket.page = 2
    await rendering

    const messages = vi.mocked(socket.send).mock.calls.map(([msg]) => String(msg))
    expect(messages.length).toBeGreaterThan(0)
    expect(messages.every(msg => msg.startsWith('<!--page:1-->'))).toBe(true)
  })

  it('renders nothing off a queue page', async () => {
    const socket = connect('/games/1', alice)

    await queuePage.render(socket)

    expect(await received(socket)).toEqual([])
  })
})
