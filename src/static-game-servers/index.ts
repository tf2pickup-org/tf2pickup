import fp from 'fastify-plugin'
import { findFree } from './find-free'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { logger } from '../logger'
import { heartbeat } from './heartbeat'
import { resolve } from 'node:path'
import { assign } from './assign'
import { update } from './update'

export const staticGameServers = {
  assign,
  findFree,
} as const

export default fp(
  async app => {
    const gameServerHeartbeatSchema = z.object({
      name: z.string(),
      address: z.string(),
      port: z.string(),
      rconPassword: z.string(),
      priority: z.coerce.number().default(0),
      internalIpAddress: z.string().optional(),
    })

    app
      .withTypeProvider<ZodTypeProvider>()
      .post(
        '/static-game-servers/',
        {
          schema: {
            body: gameServerHeartbeatSchema,
          },
        },
        async (req, reply) => {
          const { name, address, port, rconPassword, priority, internalIpAddress } = req.body
          logger.info(
            { name, address, port, rconPassword, priority, internalIpAddress },
            'game server heartbeat',
          )
          await heartbeat({
            name,
            address,
            port,
            rconPassword,
            priority: priority,
            internalIpAddress: internalIpAddress ?? req.ip,
          })
          await reply.status(200).send()
        },
      )
      .delete(
        '/static-game-servers/:id/game',
        {
          schema: {
            params: z.object({
              id: z.string(),
            }),
          },
        },
        async (request, reply) => {
          await update({ id: request.params.id }, { $unset: { game: 1 } })
          await reply.status(204).send()
        },
      )

    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'plugins'),
    })
  },
  { name: 'static game servers' },
)
