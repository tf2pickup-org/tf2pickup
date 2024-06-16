import fp from 'fastify-plugin'
import type { User } from './types/user'

declare module 'fastify' {
  interface FastifyRequest {
    user?: User
  }
}

export default fp(
  async app => {
    await app.register((await import('./plugins/steam')).default)
  },
  { name: 'auth' },
)
