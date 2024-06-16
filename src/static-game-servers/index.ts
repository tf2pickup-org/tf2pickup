import fp from 'fastify-plugin'
import { findFree } from './find-free'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { logger } from '../logger'
import { heartbeat } from './heartbeat'

export const staticGameServers = {
  findFree,
} as const

export default fp(
  // eslint-disable-next-line @typescript-eslint/require-await
  async app => {
    const gameServerHeartbeatSchema = z.object({
      name: z.string(),
      address: z.string(),
      port: z.string(),
      rconPassword: z.string(),
      priority: z.coerce.number().optional(),
      internalIpAddress: z.string().optional(),
    })

    app.withTypeProvider<ZodTypeProvider>().post(
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
          priority: priority ?? 0,
          internalIpAddress: internalIpAddress ?? req.ip,
        })
        await reply.status(200).send()
      },
    )
  },
  { name: 'static game servers' },
)
