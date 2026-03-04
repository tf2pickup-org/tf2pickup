import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { hasActiveChatMute } from './has-active-chat-mute'
import type { PlayerModel } from '../database/models/player.model'

const now = new Date('2026-01-15T12:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
})

afterEach(() => {
  vi.useRealTimers()
})

const basePlayer = {
  steamId: '76561198074409147',
} as Pick<PlayerModel, 'steamId' | 'chatMutes'>

describe('hasActiveChatMute()', () => {
  it('returns false when chatMutes is undefined', () => {
    expect(hasActiveChatMute({ ...basePlayer })).toBe(false)
  })

  it('returns false when chatMutes is empty', () => {
    expect(hasActiveChatMute({ ...basePlayer, chatMutes: [] })).toBe(false)
  })

  it('returns false when all mutes have expired', () => {
    expect(
      hasActiveChatMute({
        ...basePlayer,
        chatMutes: [
          {
            actor: '76561198074409148',
            start: new Date('2026-01-10T00:00:00Z'),
            end: new Date('2026-01-14T00:00:00Z'), // before now
            reason: 'spam',
          },
        ],
      }),
    ).toBe(false)
  })

  it('returns true when there is an active mute', () => {
    expect(
      hasActiveChatMute({
        ...basePlayer,
        chatMutes: [
          {
            actor: '76561198074409148',
            start: new Date('2026-01-14T00:00:00Z'),
            end: new Date('2026-01-16T00:00:00Z'), // after now
            reason: 'spam',
          },
        ],
      }),
    ).toBe(true)
  })

  it('returns true when one of multiple mutes is active', () => {
    expect(
      hasActiveChatMute({
        ...basePlayer,
        chatMutes: [
          {
            actor: '76561198074409148',
            start: new Date('2026-01-01T00:00:00Z'),
            end: new Date('2026-01-10T00:00:00Z'), // expired
            reason: 'spam',
          },
          {
            actor: '76561198074409148',
            start: new Date('2026-01-14T00:00:00Z'),
            end: new Date('2026-01-20T00:00:00Z'), // active
            reason: 'spam again',
          },
        ],
      }),
    ).toBe(true)
  })
})
