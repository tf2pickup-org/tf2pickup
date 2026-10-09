import { describe, expect, it, vi } from 'vitest'
import { isCurrentPage } from './is-current-page'

const url = vi.hoisted(() => ({ current: undefined as string | undefined }))
vi.mock('@fastify/request-context', () => ({
  requestContext: { get: () => url.current },
}))

describe('isCurrentPage()', () => {
  it.each([
    ['/games', true],
    ['/games?gamemode=6v6', true],
    ['/games/1234', true],
    ['/gamesx', false],
    ['/players', false],
    [undefined, false],
  ])('%s matches /games: %s', (current, expected) => {
    url.current = current
    expect(isCurrentPage('/games')).toBe(expected)
  })
})
