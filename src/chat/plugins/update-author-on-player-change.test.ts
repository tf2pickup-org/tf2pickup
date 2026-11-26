import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Events } from '../../events'
import { PlayerRole, type PlayerModel } from '../../database/models/player.model'
import type { SteamId64 } from '../../shared/types/steam-id-64'

const updateMany = vi.hoisted(() => vi.fn())
const findOne = vi.hoisted(() => vi.fn())
const handlers = vi.hoisted(() => new Map<string, (payload: never) => Promise<void>>())
vi.mock('../../database/collections', () => ({
  collections: { chatMessages: { updateMany }, players: { findOne } },
}))
vi.mock('../../players', () => ({
  players: { forPlayer: () => ({ runExclusive: (fn: () => unknown) => fn() }) },
}))
vi.mock('../../events', () => ({
  events: {
    on: (event: string, handler: (payload: never) => Promise<void>) => handlers.set(event, handler),
  },
}))
vi.mock('../../utils/safe', () => ({ safe: <T>(fn: T): T => fn }))

const before = {
  steamId: '76561198000000000' as SteamId64,
  name: 'Birch',
  roles: [] as PlayerRole[],
} as Events['player:updated']['before']
const update = (after: Partial<PlayerModel>) => {
  findOne.mockResolvedValue({ ...before, ...after })
  return handlers.get('player:updated')!({ before, after: { ...before, ...after } } as never)
}

describe('update chat author on player change', () => {
  beforeAll(async () => {
    const plugin = (await import('./update-author-on-player-change')).default
    await plugin()
  })

  beforeEach(() => {
    updateMany.mockClear()
  })

  it('updates the author on every message after a rename', async () => {
    await update({ name: 'Oak' })
    expect(updateMany).toHaveBeenCalledWith(
      { 'author.steamId': before.steamId },
      { $set: { author: { steamId: before.steamId, name: 'Oak', admin: false } } },
    )
  })

  it('updates the author when they become an admin', async () => {
    await update({ roles: [PlayerRole.admin] })
    expect(updateMany).toHaveBeenCalledWith(expect.anything(), {
      $set: { author: { steamId: before.steamId, name: 'Birch', admin: true } },
    })
  })

  it('writes the player as they are now, not as the event saw them', async () => {
    findOne.mockResolvedValueOnce({ ...before, name: 'Elm' })
    await handlers.get('player:updated')!({ before, after: { ...before, name: 'Oak' } } as never)
    expect(updateMany).toHaveBeenCalledWith(expect.anything(), {
      $set: { author: { steamId: before.steamId, name: 'Elm', admin: false } },
    })
  })

  it('leaves messages alone when neither the name nor the admin role changed', async () => {
    await update({ roles: [PlayerRole.superUser] })
    expect(updateMany).not.toHaveBeenCalled()
  })
})
