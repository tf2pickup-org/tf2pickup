import fastify from 'fastify'
import { validatorCompiler } from 'fastify-type-provider-zod'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { GameList, GameListPage } from '../../games/views/html/game-list.page'
import gamesRoutes from './index'

vi.mock('../../games/views/html/game-list.page', () => ({
  GameList: vi.fn().mockReturnValue('<div>game list</div>'),
  GameListPage: vi.fn().mockReturnValue('<html>game list page</html>'),
}))

describe('GET /games', () => {
  const app = fastify()

  beforeAll(async () => {
    app.setValidatorCompiler(validatorCompiler)
    await app.register((await import('@kitajs/fastify-html-plugin')).default)
    app.decorateRequest('isPartialFor', () => false)
    await app.register(gamesRoutes)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    vi.mocked(GameList).mockClear()
    vi.mocked(GameListPage).mockClear()
  })

  it('renders the game list for a numeric page', async () => {
    const response = await app.inject({ method: 'GET', url: '/', query: { page: '2' } })
    expect(response.statusCode).toBe(200)
    expect(GameListPage).toHaveBeenCalledWith({ page: 2, gamemode: 'all' })
  })

  it.each(['1 UNION SELECT NULL--', "1' AND (SELECT 1 FROM pg_sleep(5))--", '../../../etc/passwd'])(
    'rejects injection-style page=%s without rendering',
    async page => {
      const response = await app.inject({ method: 'GET', url: '/', query: { page } })
      expect(response.statusCode).toBe(400)
      expect(GameListPage).not.toHaveBeenCalled()
      expect(GameList).not.toHaveBeenCalled()
    },
  )

  it('strips unknown params such as goto instead of passing them on', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
      query: { goto: '1 UNION SELECT username, password FROM users--' },
    })
    expect(response.statusCode).toBe(200)
    expect(GameListPage).toHaveBeenCalledWith({ page: 1, gamemode: 'all' })
  })
})
