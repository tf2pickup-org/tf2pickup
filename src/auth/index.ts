import fp from 'fastify-plugin'
import type { User } from './types/user'
import { resolve } from 'node:path'

declare module 'fastify' {
  interface FastifyRequest {
    user?: User
  }
}

export default fp(
  async app => {
    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'plugins'),
    })
  },
  { name: 'auth' },
)
