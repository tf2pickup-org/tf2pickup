import { describe, it, expect, vi } from 'vitest'

vi.mock('@fastify/request-context', () => ({
  requestContext: { get: vi.fn() },
}))
vi.mock('../../configuration', () => ({
  configuration: { get: vi.fn().mockResolvedValue(null) },
}))
vi.mock('../../environment', () => ({
  environment: { WEBSITE_NAME: 'tf2pickup' },
}))
vi.mock('./games-link', () => ({ GamesLink: () => '' }))
vi.mock('./profile', () => ({ Profile: () => '' }))

import { NavigationBar } from './navigation-bar'

describe('NavigationBar', () => {
  it('gives the mobile menu an opaque background', async () => {
    const html = await NavigationBar()

    expect(html).not.toMatch(/bg-zinc-950\/\d+/)
    expect(html).toMatch(/id="nav-menu"\s+class="[^"]*\bmax-lg:bg-zinc-950\b/)
  })
})
