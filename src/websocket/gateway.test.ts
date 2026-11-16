import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { WebSocket } from 'ws'
import type { AppWebSocket } from './types'

vi.mock('../logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('../otel', () => ({
  meter: {
    createCounter: () => ({ add: vi.fn() }),
    createHistogram: () => ({ record: vi.fn() }),
  },
}))

import { Gateway } from './gateway'

function navigated(url: string) {
  return JSON.stringify({ navigated: url })
}

describe('Gateway', () => {
  let socket: AppWebSocket
  let gateway: Gateway

  beforeEach(() => {
    socket = {
      readyState: WebSocket.OPEN,
      send: vi.fn((_msg: string, cb: (err?: Error) => void) => {
        cb()
      }),
    } as unknown as AppWebSocket
    const app = { websocketServer: { clients: new Set([socket]) } } as unknown as FastifyInstance
    gateway = new Gateway(app)
  })

  it.each([
    ['the first navigation', [navigated('/q/6v6')]],
    ['a later navigation', [navigated('/q/6v6'), navigated('/games/1')]],
  ])('acknowledges %s', (_, messages) => {
    for (const message of messages) {
      gateway.parse(socket, message)
    }

    expect(vi.mocked(socket.send).mock.calls.map(([msg]) => msg)).toEqual(
      messages.map(() => '<!--navigated-->'),
    )
  })

  it('drops a page-scoped message when the recipient leaves the page while it renders', async () => {
    gateway.parse(socket, navigated('/q/6v6'))
    vi.mocked(socket.send).mockClear()

    const { promise, resolve } = Promise.withResolvers<string>()
    gateway.to({ url: '/q/6v6' }).send(() => promise)
    gateway.parse(socket, navigated('/games/1'))
    resolve('<div id="online-player-list"></div>')
    await vi.waitFor(() => {
      expect(socket.send).toHaveBeenCalledTimes(1)
    })
    await new Promise(setImmediate)

    expect(vi.mocked(socket.send).mock.calls.map(([msg]) => msg)).toEqual(['<!--navigated-->'])
  })
})
