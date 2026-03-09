import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { Events } from '../../events'
import type { SteamId64 } from '../../shared/types/steam-id-64'
import { Tf2ClassName } from '../../shared/types/tf2-class-name'
import type { QueueSlotId } from '../types/queue-slot-id'

vi.mock('fastify-plugin', () => ({
  default: <T>(fn: T): T => fn,
}))

const capturedHandlers = new Map<string, (payload: unknown) => Promise<void>>()
vi.mock('../../events', () => ({
  events: {
    on: vi.fn((event: string, handler: (payload: unknown) => Promise<void>) => {
      capturedHandlers.set(event, handler)
    }),
    emit: vi.fn(),
  },
}))

vi.mock('../../utils/safe', () => ({
  safe: <T>(fn: T): T => fn,
}))

const mockQueueSlotsFind = vi.fn()
vi.mock('../../database/collections', () => ({
  collections: {
    queueSlots: { find: mockQueueSlotsFind, findOne: vi.fn() },
    players: { findOne: vi.fn() },
    queueMapOptions: { find: vi.fn() },
  },
}))

vi.mock('../views/html/queue-slot', () => ({
  QueueSlot: vi.fn().mockResolvedValue('<div>slot</div>'),
}))
vi.mock('../views/html/online-player-list', () => ({
  OnlinePlayerList: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/online-player-count', () => ({
  OnlinePlayerCount: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/is-in-queue', () => ({
  IsInQueue: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/ready-up-dialog', () => ({
  ReadyUpDialog: { show: vi.fn().mockResolvedValue(''), close: vi.fn().mockResolvedValue('') },
}))
vi.mock('../views/html/map-vote', () => ({
  MapVote: vi.fn().mockResolvedValue(''),
  MapResult: vi.fn().mockReturnValue(''),
}))
vi.mock('../views/html/set-title', () => ({
  SetTitle: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/substitution-requests', () => ({
  SubstitutionRequests: Object.assign(vi.fn().mockResolvedValue(''), {
    notify: vi.fn().mockResolvedValue(''),
  }),
}))
vi.mock('../views/html/running-game-snackbar', () => ({
  RunningGameSnackbar: vi.fn().mockResolvedValue('<snackbar>'),
}))
vi.mock('../views/html/stream-list', () => ({
  StreamList: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/ban-alerts', () => ({
  BanAlerts: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/current-player-count', () => ({
  CurrentPlayerCount: vi.fn().mockResolvedValue(''),
}))
vi.mock('../../pre-ready/views/html/pre-ready-up-button', () => ({
  PreReadyUpButton: vi.fn().mockResolvedValue(''),
}))
vi.mock('../views/html/chat', () => ({
  ChatMessages: Object.assign(vi.fn().mockResolvedValue(''), {
    append: vi.fn().mockReturnValue(''),
    remove: vi.fn().mockReturnValue(''),
  }),
}))

const mockSend = vi.fn()
const mockOperator = { to: vi.fn(), send: mockSend }
mockOperator.to.mockReturnValue(mockOperator)
const mockApp = {
  gateway: {
    to: vi.fn().mockReturnValue(mockOperator),
    broadcast: vi.fn(),
    on: vi.fn(),
  },
  websocketServer: { clients: new Set() },
}

const actor = '76561198000000001' as SteamId64
const slots = [
  { id: 'soldier-0' as QueueSlotId, gameClass: Tf2ClassName.soldier, player: null, ready: false },
  { id: 'soldier-1' as QueueSlotId, gameClass: Tf2ClassName.soldier, player: null, ready: false },
  { id: 'medic-0' as QueueSlotId, gameClass: Tf2ClassName.medic, player: null, ready: false },
]

describe('sync-clients', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedHandlers.clear()
    mockOperator.to.mockReturnValue(mockOperator)
    mockApp.gateway.to.mockReturnValue(mockOperator)

    mockQueueSlotsFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue(slots) })

    const plugin = (await import('./sync-clients')).default
    await plugin(mockApp as unknown as FastifyInstance, {}, vi.fn())
  })

  describe('syncAllSlots', () => {
    it('sends all slots in a single gateway.send call', async () => {
      const handler = capturedHandlers.get('player:updated') as (
        payload: Events['player:updated'],
      ) => Promise<void>

      await handler({
        before: { steamId: actor, activeGame: undefined } as Events['player:updated']['before'],
        after: { steamId: actor, activeGame: 1 } as Events['player:updated']['after'],
      })

      // After the snackbar send (1 call), syncAllSlots should add exactly 1 more send call
      // Currently it adds 3 (one per slot), so total would be 4 instead of 2
      expect(mockSend).toHaveBeenCalledTimes(2) // 1 snackbar + 1 batched slots
    })
  })
})
