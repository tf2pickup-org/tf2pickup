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

function navigated(url: string, page: number) {
  return JSON.stringify({ navigated: url, page })
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
    gateway.parse(socket, navigated('/q/6v6', 1))
  })

  function sent() {
    return vi.mocked(socket.send).mock.calls.map(([msg]) => msg)
  }

  it('tags page-scoped messages with the page they were addressed to', async () => {
    const { promise, resolve } = Promise.withResolvers<string>()
    gateway.to({ url: '/q/6v6' }).send(() => promise)
    gateway.parse(socket, navigated('/games/1', 2))
    resolve('<div id="online-player-list"></div>')

    await vi.waitFor(() => {
      expect(sent()).toEqual(['<!--page:1--><div id="online-player-list"></div>'])
    })
  })

  it('does not tag messages that are not page-scoped', async () => {
    gateway.to({ authenticated: false }).send(() => '<div id="notification"></div>')

    await vi.waitFor(() => {
      expect(sent()).toEqual(['<div id="notification"></div>'])
    })
  })
})
