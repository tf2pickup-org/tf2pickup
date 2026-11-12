import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'node-html-parser'
import { ObjectId } from 'mongodb'
import { ChatMessageList, ChatMessages } from './chat'
import type { SteamId64 } from '../../../../shared/types/steam-id-64'

vi.mock('../../../../chat', () => ({ chat: {} }))
vi.mock('../../../../players', () => ({
  players: {
    bySteamId: vi
      .fn()
      .mockResolvedValue({ name: 'Birch', roles: [], steamId: '76561198000000000' }),
  },
}))

function message(at: Date) {
  return { _id: new ObjectId(), at, author: '76561198000000000' as SteamId64, body: 'hi' }
}

const today = new Date(2026, 10, 12, 20, 56)
const yesterday = new Date(2026, 10, 11, 22, 30)

describe('ChatMessageList', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 12, 21, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('groups messages by day, each group with its own date separator', async () => {
    const root = parse(
      await ChatMessageList({ messages: [message(today), message(today), message(yesterday)] }),
    )
    const days = root.querySelectorAll('.chat-day')
    expect(days.map(day => day.querySelector('.chat-date-separator')?.text)).toEqual([
      'Today',
      'Yesterday',
    ])
    expect(days.map(day => day.querySelectorAll('.chat-message').length)).toEqual([2, 1])
  })

  it('appends older messages from the day that is already loaded to its group', async () => {
    const root = parse(
      await ChatMessageList({
        messages: [message(today), message(yesterday)],
        before: new Date(2026, 10, 12, 8, 0),
      }),
    )
    const continued = root.querySelector('#chat-day-2026-11-12')!
    expect(continued.getAttribute('hx-swap-oob')).toBe('beforeend')
    expect(continued.querySelector('.chat-date-separator')).toBeNull()
    expect(continued.querySelectorAll('.chat-message').length).toBe(1)
    expect(root.querySelectorAll('.chat-day .chat-date-separator').map(s => s.text)).toEqual([
      'Yesterday',
    ])
  })
})

describe('ChatMessages.append', () => {
  it('adds a message from the same day to that day group', async () => {
    const root = parse(
      await ChatMessages.append({
        message: message(today),
        previousMessageAt: new Date(2026, 10, 12, 8, 0),
      }),
    )
    const target = root.querySelector('#chat-day-2026-11-12')!
    expect(target.getAttribute('hx-swap-oob')).toBe('afterbegin')
    expect(root.querySelector('.chat-date-separator')).toBeNull()
  })

  it('starts a new day group when the day changes', async () => {
    const root = parse(
      await ChatMessages.append({ message: message(today), previousMessageAt: yesterday }),
    )
    expect(root.querySelector('#chat-message-list')?.getAttribute('hx-swap-oob')).toBe('afterbegin')
    expect(root.querySelectorAll('.chat-day').length).toBe(1)
    expect(root.querySelector('.chat-day #chat-day-2026-11-12 .chat-message')).not.toBeNull()
  })
})
