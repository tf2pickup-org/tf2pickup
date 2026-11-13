import { describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { ObjectId } from 'mongodb'
import type { QueueId } from '../../../../database/models/queue.model'

vi.mock('./chat', () => ({ Chat: () => '<a href="/players/1">chat author</a>' }))
vi.mock('./online-player-list', () => ({ OnlinePlayerList: () => '<a href="/players/1">p</a>' }))
vi.mock('./online-player-count', () => ({ OnlinePlayerCount: () => '' }))
vi.mock('./current-player-count', () => ({ CurrentPlayerCount: () => '' }))

import { Sidebar } from './sidebar'

describe('Sidebar', () => {
  it('starts with a link that lets keyboard users skip the chat and the player list', async () => {
    const root = parse(await Sidebar({ queue: new ObjectId() as QueueId, required: 12 }))
    const first = root.querySelector('a, button')!
    expect(first.getAttribute('href')).toBe('#queue-toolbar')
  })
})
