import fp from 'fastify-plugin'
import { resolve } from 'node:path'
import { getStatus } from './status'

export const mumble = {
  getStatus,
} as const

export default fp(
  async app => {
    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'plugins'),
    })
  },
  {
    name: 'mumble',
  },
)
