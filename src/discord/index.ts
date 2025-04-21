import fp from 'fastify-plugin'
import { client } from './client'
import { toAdmins } from './to-admins'
import { version } from '../version'
import { resolve } from 'node:path'

export const discord = {
  client,
} as const

export default fp(
  async app => {
    if (!client) {
      return
    }

    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'plugins'),
    })

    app.addHook('onListen', async () => {
      await toAdmins(`tf2pickup.org version ${version} started`)
    })
  },
  {
    name: 'discord',
  },
)
