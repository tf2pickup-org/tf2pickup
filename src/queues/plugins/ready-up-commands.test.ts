import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ObjectId } from 'mongodb'
import type { SteamId64 } from '../../shared/types/steam-id-64'

const handlers = vi.hoisted(
  () => new Map<string, (socket: { player?: { steamId: SteamId64 } }) => Promise<void>>(),
)
vi.mock('../../database/collections', () => ({
  collections: { captainPool: { findOne: vi.fn() } },
}))
vi.mock('../auto/leave', () => ({ leave: vi.fn() }))
vi.mock('../auto/ready-up', () => ({ readyUp: vi.fn() }))
vi.mock('../captain/leave', () => ({ leave: vi.fn() }))
vi.mock('../captain/ready-up', () => ({ readyUp: vi.fn() }))
vi.mock('../auto/views/html/ready-up-dialog', () => ({
  ReadyUpDialog: { close: vi.fn().mockReturnValue('close') },
}))
vi.mock('../get-state', () => ({ getState: vi.fn().mockResolvedValue('waiting') }))
vi.mock('../page', () => ({ queuePage: { update: vi.fn(), updateAll: vi.fn() } }))
vi.mock('../ws-safe', () => ({ wsSafe: (_operation: string, run: unknown) => run }))

import { collections } from '../../database/collections'
import { leave as autoLeave } from '../auto/leave'
import { readyUp as autoReadyUp } from '../auto/ready-up'
import { leave as captainLeave } from '../captain/leave'
import { readyUp as captainReadyUp } from '../captain/ready-up'
import plugin from './ready-up-commands'

const steamId = '76561198000000001' as SteamId64
const queue = new ObjectId()
const socket = { player: { steamId } }
const send = vi.fn()

beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(collections.captainPool.findOne).mockResolvedValue(null)
  vi.mocked(autoLeave).mockResolvedValue({ queue } as never)
  await (plugin as unknown as (app: unknown) => Promise<void>)({
    gateway: {
      on: (name: string, run: (socket: typeof socket) => Promise<void>) => handlers.set(name, run),
      to: () => ({ send }),
    },
  })
})

describe('shared ready-up dialog dispatch', () => {
  it.each(['queue:readyup', 'queue:leave'])(
    '%s handles an auto member in the auto engine only',
    async name => {
      await handlers.get(name)!(socket)
      expect(name === 'queue:readyup' ? autoReadyUp : autoLeave).toHaveBeenCalledWith(steamId)
      expect(captainReadyUp).not.toHaveBeenCalled()
      expect(captainLeave).not.toHaveBeenCalled()
    },
  )

  it.each(['queue:readyup', 'queue:leave'])(
    '%s handles a captain member in the captain engine only',
    async name => {
      vi.mocked(collections.captainPool.findOne).mockResolvedValue({ queue } as never)
      await handlers.get(name)!(socket)
      expect(name === 'queue:readyup' ? captainReadyUp : captainLeave).toHaveBeenCalledWith(
        queue,
        steamId,
      )
      expect(autoReadyUp).not.toHaveBeenCalled()
      expect(autoLeave).not.toHaveBeenCalled()
      expect(send).toHaveBeenCalled()
    },
  )

  it('does not close the dialog if the engine rejects the ready-up', async () => {
    vi.mocked(collections.captainPool.findOne).mockResolvedValue({ queue } as never)
    vi.mocked(captainReadyUp).mockRejectedValueOnce(new Error('wrong state'))
    await expect(handlers.get('queue:readyup')!(socket)).rejects.toThrow('wrong state')
    expect(send).not.toHaveBeenCalled()
    expect(autoReadyUp).not.toHaveBeenCalled()
  })

  it('rejects anonymous commands before reading membership', async () => {
    await expect(handlers.get('queue:readyup')!({})).rejects.toThrow('unauthorized')
    expect(collections.captainPool.findOne).not.toHaveBeenCalled()
  })
})
