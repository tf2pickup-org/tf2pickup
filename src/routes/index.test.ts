import fastify from 'fastify'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueuePage } from '../queue-auto/views/html/queue.page'
import { defaultGamemode } from '../shared/default-gamemode'
import indexRoutes from './index'

vi.mock('../queue-auto/views/html/queue.page', () => ({
  QueuePage: vi.fn().mockReturnValue('<div id="queue"></div>'),
}))

vi.mock('../environment', () => ({
  environment: {
    QUEUE_CONFIG: '6v6',
  },
}))

describe('GET /', () => {
  const app = fastify()

  beforeAll(async () => {
    await app.register((await import('@kitajs/fastify-html-plugin')).default)
    app.decorateRequest('isPartialFor', function (target: string) {
      return this.headers['hx-target'] === target
    })
    await app.register(indexRoutes)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.mocked(QueuePage).mockClear()
  })

  it('renders the complete queue page for a normal request', async () => {
    const response = await app.inject({ method: 'GET', url: '/' })

    expect(response.statusCode).toBe(200)
    expect(QueuePage).toHaveBeenCalledWith({ gamemode: defaultGamemode, partial: false })
  })

  it('renders only queue fragments when HTMX targets the queue', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { 'hx-target': 'queue' },
    })

    expect(response.statusCode).toBe(200)
    expect(QueuePage).toHaveBeenCalledWith({ gamemode: defaultGamemode, partial: true })
  })
})
