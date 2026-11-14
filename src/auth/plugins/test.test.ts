import fastify from 'fastify'
import { validatorCompiler } from 'fastify-type-provider-zod'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { environment } from '../../environment'

vi.mock('../../environment', () => ({
  environment: {
    ENABLE_TEST_AUTH: 'true',
    TEST_AUTH_SECRET: undefined as string | undefined,
    WEBSITE_URL: 'https://example.com',
  },
}))

const updateOne = vi.fn()
vi.mock('../../database/collections', () => ({
  collections: { players: { updateOne } },
}))

vi.mock('../../logger', () => ({
  logger: { warn: vi.fn() },
}))

const steamId = '76561198074409147'
const secret = 'a'.repeat(32)

describe('GET /auth/test', () => {
  let app: ReturnType<typeof fastify>
  const sessionSet = vi.fn()
  const setCookie = vi.fn()

  beforeEach(async () => {
    sessionSet.mockClear()
    setCookie.mockClear()
    updateOne.mockClear()
    app = fastify()
    app.setValidatorCompiler(validatorCompiler)
    app.decorateRequest('session', {
      getter: () => ({ set: sessionSet }),
    })
    app.decorateReply('setCookie', setCookie)
    await app.register((await import('./test')).default)
    await app.ready()
  })

  afterEach(async () => {
    await app.close()
    environment.TEST_AUTH_SECRET = undefined
  })

  it('signs in without a secret when none is configured', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/test', query: { steamId } })
    expect(response.statusCode).toBe(302)
    expect(sessionSet).toHaveBeenCalledWith('steamId', steamId)
  })

  it('leaves the rules flag alone by default', async () => {
    await app.inject({ method: 'GET', url: '/auth/test', query: { steamId } })
    expect(updateOne).not.toHaveBeenCalled()
  })

  it.each([
    ['false', false],
    ['true', true],
  ])('sets hasAcceptedRules for acceptedRules=%s', async (given, expected) => {
    await app.inject({ method: 'GET', url: '/auth/test', query: { steamId, acceptedRules: given } })
    expect(updateOne).toHaveBeenCalledWith({ steamId }, { $set: { hasAcceptedRules: expected } })
  })

  describe('when a secret is configured', () => {
    beforeEach(() => {
      environment.TEST_AUTH_SECRET = secret
    })

    it('signs in with the right secret', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/test',
        query: { steamId, secret },
      })
      expect(response.statusCode).toBe(302)
      expect(sessionSet).toHaveBeenCalledWith('steamId', steamId)
    })

    it('hands out the rate limit exemption cookie', async () => {
      await app.inject({ method: 'GET', url: '/auth/test', query: { steamId, secret } })
      expect(setCookie).toHaveBeenCalledWith(
        'test-auth-secret',
        secret,
        expect.objectContaining({ httpOnly: true }),
      )
    })

    it.each([undefined, 'wrong', secret.slice(1)])('rejects secret=%s', async given => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/test',
        query:
          given === undefined
            ? { steamId, acceptedRules: 'false' }
            : { steamId, secret: given, acceptedRules: 'false' },
      })
      expect(response.statusCode).toBe(403)
      expect(sessionSet).toHaveBeenCalledTimes(0)
      expect(updateOne).not.toHaveBeenCalled()
    })
  })
})
