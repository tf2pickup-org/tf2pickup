import { beforeEach, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import { QueueState } from '../../../database/models/queue-state.model'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

const handlers = vi.hoisted(() => new Map<string, (event: unknown) => Promise<void>>())
vi.mock('../../../events', () => ({
  events: { on: (name: string, run: (event: unknown) => Promise<void>) => handlers.set(name, run) },
}))
vi.mock('../../../utils/safe', () => ({ safe: (run: unknown) => run }))
vi.mock('../../page', () => ({ queuePage: { update: vi.fn() } }))
vi.mock('../../get', () => ({ get: vi.fn() }))
vi.mock('../../get-state', () => ({ getState: vi.fn() }))
vi.mock('../get-pool', () => ({ getPool: vi.fn() }))
vi.mock('../../auto/views/html/ready-up-dialog', () => ({
  ReadyUpDialog: { show: vi.fn().mockReturnValue('show'), close: vi.fn().mockReturnValue('close') },
}))

import { get } from '../../get'
import { getState } from '../../get-state'
import { getPool } from '../get-pool'
import { queuePage } from '../../page'
import { ReadyUpDialog } from '../../auto/views/html/ready-up-dialog'
import plugin from './sync-clients'

const queue = new ObjectId()
const unready = '76561198000000001' as SteamId64
const readied = '76561198000000002' as SteamId64
const sends: {
  filter: { players?: SteamId64[]; player?: SteamId64 }
  render: (actor?: SteamId64) => unknown
  options: unknown
}[] = []

beforeEach(async () => {
  vi.clearAllMocks()
  sends.length = 0
  vi.mocked(get).mockResolvedValue({ launchMode: 'captain' } as never)
  vi.mocked(getState).mockResolvedValue(QueueState.ready)
  vi.mocked(getPool).mockResolvedValue([
    { player: { steamId: unready }, ready: false },
    { player: { steamId: readied }, ready: true },
  ] as never)
  await (plugin as unknown as (app: unknown) => Promise<void>)({
    gateway: {
      to: (filter: { players?: SteamId64[]; player?: SteamId64 }) => ({
        send: (render: (actor?: SteamId64) => unknown, options: unknown) =>
          sends.push({ filter, render, options }),
      }),
    },
  })
})

it('sends the unchanged ready dialog only to unready captain members, with stale-message protection', async () => {
  await handlers.get('queue/state:updated')!({ queue, state: QueueState.ready })
  expect(sends).toHaveLength(1)
  expect(sends[0]!.filter).toEqual({ players: [unready] })
  expect(sends[0]!.options).toEqual({ key: 'ready-up-dialog' })
  expect(await sends[0]!.render(unready)).toBe('show')
  expect(ReadyUpDialog.show).toHaveBeenCalledWith(unready, expect.anything())
})

it('ignores auto queue state changes without fetching captain membership', async () => {
  vi.mocked(get).mockResolvedValue({ launchMode: 'auto' } as never)
  await handlers.get('queue/state:updated')!({ queue, state: QueueState.ready })
  expect(getPool).not.toHaveBeenCalled()
  expect(sends).toHaveLength(0)
})

it('ignores a stale ready event after the queue has already entered drafting', async () => {
  vi.mocked(getState).mockResolvedValue(QueueState.drafting)
  await handlers.get('queue/state:updated')!({ queue, state: QueueState.ready })
  expect(sends).toHaveLength(0)
  expect(ReadyUpDialog.show).not.toHaveBeenCalled()
})

it('closes all remaining members dialogs on ready-state exit', async () => {
  vi.mocked(getState).mockResolvedValue(QueueState.waiting)
  await handlers.get('queue/state:updated')!({ queue, state: QueueState.waiting })
  expect(sends[0]!.filter).toEqual({ players: [unready, readied] })
  expect(await sends[0]!.render()).toBe('close')
})

it('closes a departed members dialog even though they are no longer in the pool', async () => {
  await handlers.get('queue/captainPool:left')!({ queue, player: unready })
  expect(sends[0]!.filter).toEqual({ player: unready })
  expect(sends[0]!.options).toEqual({ key: 'ready-up-dialog' })
  expect(getPool).not.toHaveBeenCalled()
})

it('updates only the queue identified by the captain pool event', async () => {
  await handlers.get('queue/captainPool:updated')!({ queue })
  expect(queuePage.update).toHaveBeenCalledWith(expect.anything(), queue, {
    captainPool: true,
    counts: true,
  })
})
