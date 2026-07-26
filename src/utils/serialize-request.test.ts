import { describe, expect, it } from 'vitest'
import type { FastifyRequest } from 'fastify'
import { serializeRequest } from './serialize-request'

const makeRequest = (overrides: Partial<FastifyRequest> = {}) =>
  ({
    method: 'GET',
    url: '/players/123?gamespage=1',
    host: 'tf2pickup.pl',
    ip: '203.0.113.7',
    headers: {},
    socket: { remoteAddress: '172.18.0.1', remotePort: 54321 },
    ...overrides,
  }) as unknown as FastifyRequest

describe('serializeRequest', () => {
  it('captures the real client IP from forwarding headers', () => {
    const req = makeRequest({ headers: { 'x-forwarded-for': '198.51.100.9, 172.18.0.1' } })
    expect(serializeRequest(req).clientIp).toBe('198.51.100.9')
  })

  it('captures the User-Agent header', () => {
    const req = makeRequest({ headers: { 'user-agent': 'sqlmap/1.8' } })
    expect(serializeRequest(req).userAgent).toBe('sqlmap/1.8')
  })

  it('keeps the default request fields', () => {
    expect(serializeRequest(makeRequest())).toMatchObject({
      method: 'GET',
      url: '/players/123?gamespage=1',
      host: 'tf2pickup.pl',
      remoteAddress: '203.0.113.7',
      remotePort: 54321,
    })
  })
})
