import { z } from 'zod'
import { logger } from '../../logger'
import { staticGameServers } from '../../static-game-servers'
import { routes } from '../../utils/routes'

const gameServerHeartbeatSchema = z.object({
  name: z.string(),
  address: z.string(),
  port: z.string(),
  rconPassword: z.string(),
  priority: z.coerce.number().default(0),
  internalIpAddress: z.string().optional(),
})

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.post(
    '/',
    {
      schema: {
        body: gameServerHeartbeatSchema,
      },
    },
    async (req, reply) => {
      const { name, address, port, rconPassword, priority, internalIpAddress } = req.body
      logger.info(
        { name, address, port, rconPassword: 'xxxxxxxxx', priority, internalIpAddress },
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
})
