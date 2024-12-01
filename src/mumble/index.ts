import fp from 'fastify-plugin'
import { resolve } from 'node:path'

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
