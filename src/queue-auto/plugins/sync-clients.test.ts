import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import type { FastifyInstance } from 'fastify'

const {
  mockPlayersFind,
  mockPlayersCollectionFindOne,
  mockQueueSlotsFind,
  mockQueueSlotsFindOne,
  mockNotFound,
} = vi.hoisted(() => ({
  mockPlayersFind: vi.fn(),
  mockPlayersCollectionFindOne: vi.fn(),
  mockQueueSlotsFind: vi.fn(),
  mockQueueSlotsFindOne: vi.fn(),
  mockNotFound: vi.fn((msg: string) => new Error(msg)),
}))

vi.mock('fastify-plugin', () => ({ default: <T>(fn: T): T => fn }))
vi.mock('../../events', () => ({ events: { on: vi.fn() } }))
vi.mock('../../utils/safe', () => ({ safe: <T>(fn: T): T => fn }))
vi.mock('../../players', () => ({ players: { bySteamId: vi.fn() } }))
vi.mock('../../errors', () => ({ errors: { notFound: mockNotFound } }))
vi.mock('../../database/collections', () => ({
  collections: {
    players: { find: mockPlayersFind, findOne: mockPlayersCollectionFindOne },
    queueSlots: { find: mockQueueSlotsFind, findOne: mockQueueSlotsFindOne },
  },
}))

vi.mock('../views/html/queue-slot', () => ({ QueueSlot: vi.fn().mockResolvedValue('') }))
vi.mock('../views/html/online-player-list', () => ({
  OnlinePlayerList: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/ready-up-dialog', () => ({
  ReadyUpDialog: {
    close: vi.fn().mockResolvedValue(''),
    show: vi.fn().mockReturnValue(''),
  },
}))
vi.mock('../views/html/map-vote', () => ({
  MapResult: vi.fn().mockResolvedValue(''),
  MapVote: vi.fn().mockReturnValue(''),
}))
vi.mock('../views/html/set-title', () => ({ SetTitle: vi.fn().mockResolvedValue('') }))
vi.mock('../views/html/substitution-requests', () => ({
  SubstitutionRequests: Object.assign(vi.fn().mockResolvedValue(''), {
    notify: vi.fn().mockReturnValue(''),
  }),
}))
vi.mock('../views/html/running-game-snackbar', () => ({
  RunningGameSnackbar: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/stream-list', () => ({ StreamList: vi.fn().mockResolvedValue('') }))
vi.mock('../views/html/ban-alerts', () => ({ BanAlerts: vi.fn().mockResolvedValue('') }))
vi.mock('../views/html/current-player-count', () => ({
  CurrentPlayerCount: vi.fn().mockResolvedValue(''),
}))
vi.mock('../../pre-ready/views/html/pre-ready-up-button', () => ({
  PreReadyUpButton: vi.fn().mockReturnValue(''),
}))
vi.mock('../views/html/online-player-count', () => ({
  OnlinePlayerCount: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/chat', () => ({
  ChatMessages: Object.assign(vi.fn().mockResolvedValue(''), {
    append: vi.fn().mockReturnValue(''),
    remove: vi.fn().mockReturnValue(''),
  }),
}))
vi.mock('../views/html/is-in-queue', () => ({ IsInQueue: vi.fn().mockResolvedValue('') }))

import { events } from '../../events'
import { players } from '../../players'
import plugin from './sync-clients'

const steamId1 = '76561198000000001' as SteamId64
const steamId2 = '76561198000000002' as SteamId64

function makeApp() {
  const mockSend = vi.fn()
  const mockTo = vi.fn()
  mockTo.mockReturnValue({ to: mockTo, send: mockSend })
  return {
    gateway: {
      to: mockTo,
      broadcast: vi.fn(),
      on: vi.fn(),
    },
    websocketServer: {
      clients: new Set(),
    },
  } as unknown as FastifyInstance
}

type Handler<T> = (params: T) => Promise<void>

function getHandler<T>(event: string): Handler<T> {
  const call = vi.mocked(events.on).mock.calls.find(([e]) => e === event)
  if (!call) throw new Error(`No handler registered for event: ${event}`)
  return call[1] as Handler<T>
}

describe('sync-clients', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    vi.clearAllMocks()
    app = makeApp()
    mockQueueSlotsFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) })
    mockQueueSlotsFindOne.mockResolvedValue(null)
    mockPlayersCollectionFindOne.mockResolvedValue(null)
    mockPlayersFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) })
    await (plugin as unknown as (app: FastifyInstance) => Promise<void>)(app)
  })

  describe('syncAllSlots', () => {
    it('issues a single batch DB query instead of per-player bySteamId calls', async () => {
      mockPlayersFind.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ steamId: steamId1 }]),
      })
      const handler = getHandler<{ steamId: SteamId64; activeGame: number }>(
        'player/activeGame:updated',
      )

      await handler({ steamId: steamId1, activeGame: 1 })

      expect(mockPlayersFind).toHaveBeenCalledOnce()
      expect(mockPlayersFind).toHaveBeenCalledWith(
        { steamId: { $in: [steamId1] } },
        expect.objectContaining({ projection: expect.any(Object) }),
      )
      expect(vi.mocked(players.bySteamId)).not.toHaveBeenCalled()
    })

    it('throws when the player is not in the batch result', async () => {
      mockPlayersFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) })
      const handler = getHandler<{ steamId: SteamId64; activeGame: number }>(
        'player/activeGame:updated',
      )

      await expect(handler({ steamId: steamId1, activeGame: 1 })).rejects.toThrow()
      expect(mockNotFound).toHaveBeenCalledWith(expect.stringContaining(steamId1))
    })
  })

  describe('fetchActorMap', () => {
    it('issues a single batch DB query for multiple recipients', async () => {
      const recipientSlots = [
        { player: { steamId: steamId1 }, canMakeFriendsWith: [steamId2] },
        { player: { steamId: steamId2 }, canMakeFriendsWith: [steamId1] },
      ]
      mockQueueSlotsFindOne.mockResolvedValueOnce({ player: { steamId: steamId1 } })
      mockQueueSlotsFind.mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue(recipientSlots),
      })
      mockPlayersFind.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ steamId: steamId1 }, { steamId: steamId2 }]),
      })
      const handler = getHandler<{ target: SteamId64 }>('queue/friendship:created')

      await handler({ target: steamId1 })

      expect(mockPlayersFind).toHaveBeenCalledOnce()
      expect(mockPlayersFind).toHaveBeenCalledWith(
        { steamId: { $in: [steamId1, steamId2] } },
        expect.objectContaining({ projection: expect.any(Object) }),
      )
    })
  })

  describe('queue/slots:updated handler', () => {
    it('pre-fetches queue-page players in a single batch query', async () => {
      ;(app.websocketServer.clients as Set<unknown>).add({
        currentUrl: '/',
        player: { steamId: steamId1 },
      })
      ;(app.websocketServer.clients as Set<unknown>).add({
        currentUrl: '/',
        player: { steamId: steamId2 },
      })
      ;(app.websocketServer.clients as Set<unknown>).add({ currentUrl: '/', player: undefined })
      mockPlayersFind.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ steamId: steamId1 }, { steamId: steamId2 }]),
      })
      const handler = getHandler<{ slots: unknown[] }>('queue/slots:updated')

      await handler({ slots: [] })

      expect(mockPlayersFind).toHaveBeenCalledOnce()
      expect(mockPlayersFind).toHaveBeenCalledWith(
        { steamId: { $in: [steamId1, steamId2] } },
        expect.objectContaining({ projection: expect.any(Object) }),
      )
      expect(vi.mocked(players.bySteamId)).not.toHaveBeenCalled()
    })

    it('targets only clients on the queue page', async () => {
      ;(app.websocketServer.clients as Set<unknown>).add({
        currentUrl: '/',
        player: { steamId: steamId1 },
      })
      const handler = getHandler<{ slots: unknown[] }>('queue/slots:updated')

      await handler({ slots: [] })

      expect(app.gateway.to).toHaveBeenCalledWith({ url: '/' })
    })

    it('ignores players that are not on the queue page', async () => {
      ;(app.websocketServer.clients as Set<unknown>).add({
        currentUrl: '/players',
        player: { steamId: steamId1 },
      })
      ;(app.websocketServer.clients as Set<unknown>).add({ currentUrl: '/', player: undefined })
      const handler = getHandler<{ slots: unknown[] }>('queue/slots:updated')

      await handler({ slots: [] })

      expect(mockPlayersFind).toHaveBeenCalledWith(
        { steamId: { $in: [] } },
        expect.objectContaining({ projection: expect.any(Object) }),
      )
    })

    it('skips DB work and slot updates when no client is on the queue page', async () => {
      ;(app.websocketServer.clients as Set<unknown>).add({
        currentUrl: '/players',
        player: { steamId: steamId1 },
      })
      const handler = getHandler<{ slots: unknown[] }>('queue/slots:updated')

      await handler({ slots: [] })

      expect(mockPlayersFind).not.toHaveBeenCalled()
      expect(app.gateway.to).not.toHaveBeenCalled()
      // the document title is still broadcast to every client
      expect(app.gateway.broadcast).toHaveBeenCalledOnce()
    })
  })
})
