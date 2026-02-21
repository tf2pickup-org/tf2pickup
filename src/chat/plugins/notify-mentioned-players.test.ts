import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import type { SteamId64 } from '../../shared/types/steam-id-64'

// Must mock before importing the module under test
const mockFindOne = vi.fn()
vi.mock('../../database/collections', () => ({
  collections: {
    onlinePlayers: {
      findOne: mockFindOne,
    },
  },
}))

vi.mock('../../players', () => ({
  players: {
    bySteamId: vi.fn().mockResolvedValue({ preferences: { soundVolume: '0.8' } }),
  },
}))

// Capture the event handler registered by the plugin
let capturedHandler: ((payload: any) => Promise<void>) | undefined
const mockEventsOn = vi.fn((event: string, handler: any) => {
  if (event === 'chat:messageSent') {
    // `safe()` wraps the handler — unwrap it by calling through
    capturedHandler = handler
  }
})
vi.mock('../../events', () => ({
  events: { on: mockEventsOn },
}))

// Mock safe() to pass the handler through unchanged so we can test it directly
vi.mock('../../utils/safe', () => ({
  safe: (fn: any) => fn,
}))

// Mock the notification fragment
vi.mock('../views/html/chat-mention-notification', () => ({
  ChatMentionNotification: vi.fn().mockResolvedValue('<div>notification</div>'),
}))

// Mock gateway
const mockGatewaySend = vi.fn()
const mockGatewayTo = vi.fn(() => ({ send: mockGatewaySend }))
const mockApp = {
  gateway: { to: mockGatewayTo },
}

describe('notify-mentioned-players plugin', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedHandler = undefined
    // Re-import (with cache busting) to re-run module and re-register handler
    vi.resetModules()

    // Re-apply mocks after resetModules
    const { events } = await import('../../events')
    ;(events.on as MockedFunction<typeof events.on>) = mockEventsOn

    const pluginModule = await import('./notify-mentioned-players')
    const plugin = pluginModule.default
    // Execute the plugin function directly with the mock app
    await plugin(mockApp as any, {}, () => {})
  })

  it('sends notification to online mentioned players', async () => {
    mockFindOne.mockResolvedValue({ steamId: '76561198000000001', name: 'wonszu', avatar: '' })

    expect(capturedHandler).toBeDefined()
    await capturedHandler!({
      message: {
        mentions: ['76561198000000001' as SteamId64],
        at: new Date(),
        author: '76561198000000002' as SteamId64,
        body: 'hey @wonszu',
        originalBody: 'hey @wonszu',
      },
    })

    expect(mockGatewayTo).toHaveBeenCalledWith({ player: '76561198000000001' })
    expect(mockGatewaySend).toHaveBeenCalledTimes(1)
  })

  it('does not send notification when mentioned player is offline', async () => {
    mockFindOne.mockResolvedValue(null)

    expect(capturedHandler).toBeDefined()
    await capturedHandler!({
      message: {
        mentions: ['76561198000000001' as SteamId64],
        at: new Date(),
        author: '76561198000000002' as SteamId64,
        body: 'hey @wonszu',
        originalBody: 'hey @wonszu',
      },
    })

    expect(mockGatewaySend).not.toHaveBeenCalled()
  })

  it('does nothing when message has no mentions', async () => {
    expect(capturedHandler).toBeDefined()
    await capturedHandler!({
      message: {
        mentions: [],
        at: new Date(),
        author: '76561198000000002' as SteamId64,
        body: 'hello world',
        originalBody: 'hello world',
      },
    })

    expect(mockFindOne).not.toHaveBeenCalled()
    expect(mockGatewaySend).not.toHaveBeenCalled()
  })
})
