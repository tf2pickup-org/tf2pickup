import fp from 'fastify-plugin'
import type { User } from './types/user'
import type { FastifyRequest } from 'fastify'
import { PlayerRole } from '../database/models/player.model'

function isAdmin(request: FastifyRequest) {
  return request.user?.player.roles.includes(PlayerRole.admin) ?? false
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: User
    isAdmin: boolean
  }
}

export default fp(
  async app => {
    await app.register((await import('./plugins/sign-out')).default)
    await app.register((await import('./plugins/steam')).default)
    await app.register((await import('./plugins/authenticate')).default)
    await app.register((await import('./plugins/authorize')).default)

    // eslint-disable-next-line @typescript-eslint/require-await
    app.addHook('onRequest', async request => {
      request.isAdmin = isAdmin(request)
    })
  },
  { name: 'auth' },
)
