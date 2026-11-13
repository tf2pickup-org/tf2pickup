import { describe, expect, it, vi } from 'vitest'
import { send } from './send'
import { collections } from '../database/collections'
import type { SteamId64 } from '../shared/types/steam-id-64'

vi.mock('../database/collections', () => ({
  collections: {
    chatMessages: {
      insertOne: vi.fn(),
      findOne: vi.fn().mockResolvedValue({ at: new Date(2026, 10, 12, 20, 56) }),
    },
  },
}))
vi.mock('../players', () => ({
  players: { bySteamId: vi.fn().mockResolvedValue({}), hasActiveChatMute: () => false },
}))
vi.mock('../events', () => ({ events: { emit: vi.fn() } }))
vi.mock('./resolve-mentions', () => ({
  resolveMentions: (body: string) => ({ body, mentions: [] }),
}))
vi.mock('./get-mention-names', () => ({ getMentionNames: () => new Map() }))

describe('send()', () => {
  it('skips deleted messages when looking up the previous message', async () => {
    await send({ author: '76561198000000000' as SteamId64, body: 'hi' })
    expect(collections.chatMessages.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ deletedAt: { $exists: false } }),
      expect.anything(),
    )
  })
})
