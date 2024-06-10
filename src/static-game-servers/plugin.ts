import fp from 'fastify-plugin'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { logger } from '../logger'
import { heartbeat } from './heartbeat'

const gameServerHeartbeatSchema = z.object({
  name: z.string(),
  address: z.string(),
  port: z.string(),
  rconPassword: z.string(),
  priority: z.coerce.number().optional(),
  internalIpAddress: z.string().optional(),
})

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
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
})
