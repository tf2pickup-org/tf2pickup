import { z } from 'zod'
import { routes } from '../../../../utils/routes'
import { queueToDto } from '../../../../queue-auto/views/json/queue-to-dto'
import { Gamemode } from '../../../../shared/types/gamemode'
import { defaultGamemode } from '../../../../shared/default-gamemode'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        querystring: z.object({
          gamemode: z.enum(Gamemode).default(defaultGamemode),
        }),
      },
    },
    async (req, reply) => {
      const dto = await queueToDto(req.query.gamemode, '/api/v1/queue')
      return reply.type('application/hal+json').status(200).send(dto)
    },
  )
})
