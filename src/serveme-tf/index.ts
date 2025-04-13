import fp from 'fastify-plugin'
import { assign } from './assign'
import { client } from './client'
import { listRegions } from './list-regions'
import { resolve } from 'node:path'
import { waitForStart } from './wait-for-start'
import { PlayerRole } from '../database/models/player.model'
import { errors } from '../errors'
import { ServemeTfServerList } from './views/html/serveme-tf-server-list'

export const servemeTf = {
  assign,
  isEnabled: client !== null,
  listRegions,
  waitForStart,
} as const

export default fp(async app => {
  await app.register((await import('@fastify/autoload')).default, {
    dir: resolve(import.meta.dirname, 'plugins'),
  })

  app.get(
    '/serveme-tf/list-servers',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
    },
    async (_, reply) => {
      if (!client) {
        throw errors.badRequest(`serveme.tf is disabled`)
      }

      const { servers } = await client.findOptions()
      return reply.html(ServemeTfServerList({ servers }))
    },
  )
})
