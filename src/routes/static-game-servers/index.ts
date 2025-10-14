import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { logger } from '../../logger'
import { staticGameServers } from '../../static-game-servers'

const gameServerHeartbeatSchema = z.object({
  name: z.string(),
  address: z.string(),
  port: z.string(),
  rconPassword: z.string(),
  priority: z.coerce.number().default(0),
  internalIpAddress: z.string().optional(),
})

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post(
    '/',
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
      await staticGameServers.heartbeat({
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
}
