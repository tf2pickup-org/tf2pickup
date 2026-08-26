import fastify from 'fastify'
import fp from 'fastify-plugin'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PlayerRole } from '../database/models/player.model'
import adminAuthorize from './admin-authorize'
import authorize from './plugins/authorize'

// Stub of the auth/steam plugin: decorates `request.user` and populates it from
// an `x-test-user` header carrying the player's roles.
const steamStub = fp(
  async app => {
    app.decorateRequest('user', undefined)
    app.addHook('preHandler', async request => {
      const header = request.headers['x-test-user']
      if (typeof header === 'string') {
        request.user = { player: { roles: JSON.parse(header) as PlayerRole[] } } as never
      }
    })
  },
  { name: 'auth/steam' },
)

const asUser = (roles: PlayerRole[]) => ({ 'x-test-user': JSON.stringify(roles) })

describe('adminAuthorize', () => {
  const app = fastify()

  beforeAll(async () => {
    await app.register(await import('@fastify/sensible'))
    await app.register(steamStub)
    // The global authorize plugin still enforces explicit `authorize` config.
    await app.register(authorize)

    // Admin routes live in their own encapsulated context, guarded by adminAuthorize.
    await app.register(
      async admin => {
        await admin.register(adminAuthorize)
        admin.get('/thing', async () => 'ok')
        admin.get('/public-thing', { config: { public: true } }, async () => 'ok')
        admin.get('/super', { config: { authorize: [PlayerRole.superUser] } }, async () => 'ok')
      },
      { prefix: '/admin' },
    )
    app.get('/public', async () => 'ok')

    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('an admin route with no explicit guard', () => {
    it('rejects an anonymous request with 401', async () => {
      const response = await app.inject({ method: 'GET', url: '/admin/thing' })
      expect(response.statusCode).toBe(401)
    })

    it('rejects a signed-in non-admin with 403', async () => {
      const response = await app.inject({ method: 'GET', url: '/admin/thing', headers: asUser([]) })
      expect(response.statusCode).toBe(403)
    })

    it('allows an admin', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/thing',
        headers: asUser([PlayerRole.admin]),
      })
      expect(response.statusCode).toBe(200)
    })
  })

  it('leaves an admin route marked public open to anonymous requests', async () => {
    const response = await app.inject({ method: 'GET', url: '/admin/public-thing' })
    expect(response.statusCode).toBe(200)
  })

  it('defers to an explicit authorize that is stricter than the admin default', async () => {
    const asAdmin = await app.inject({
      method: 'GET',
      url: '/admin/super',
      headers: asUser([PlayerRole.admin]),
    })
    expect(asAdmin.statusCode).toBe(403)

    const asSuperUser = await app.inject({
      method: 'GET',
      url: '/admin/super',
      headers: asUser([PlayerRole.superUser]),
    })
    expect(asSuperUser.statusCode).toBe(200)
  })

  it('does not guard routes outside the admin context', async () => {
    const response = await app.inject({ method: 'GET', url: '/public' })
    expect(response.statusCode).toBe(200)
  })
})
