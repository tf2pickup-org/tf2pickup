import z from 'zod'
import { QueuePage } from '../queue-auto/views/html/queue.page'
import { defaultGamemode, enabledGamemodes } from '../shared/enabled-gamemodes'
import { Gamemode } from '../shared/types/gamemode'
import { errors } from '../errors'
import { routes } from '../utils/routes'
import disableCache from 'fastify-disablecache'

export default routes(async app => {
  await app.register(disableCache)
  app.get(
    '/',
    {
      schema: {
        querystring: z.object({
          gamemode: z.enum(Gamemode).optional(),
        }),
      },
    },
    async (request, reply) => {
      const gamemode = request.query.gamemode ?? defaultGamemode
      if (!enabledGamemodes.includes(gamemode)) {
        throw errors.notFound(`gamemode not enabled: ${gamemode}`)
      }

      return reply.html(QueuePage({ gamemode }))
    },
  )
})
