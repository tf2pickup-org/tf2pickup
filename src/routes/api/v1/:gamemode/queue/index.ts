import { z } from 'zod'
import { routes } from '../../../../../utils/routes'
import { queueToDto } from '../../../../../queue-auto/views/json/queue-to-dto'
import { errors } from '../../../../../errors'
import { Gamemode } from '../../../../../shared/types/gamemode'
import { enabledGamemodes } from '../../../../../shared/enabled-gamemodes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      schema: {
        params: z.object({
          gamemode: z.enum(Gamemode),
        }),
      },
    },
    async (req, reply) => {
      const { gamemode } = req.params
      if (!enabledGamemodes.includes(gamemode)) {
        throw errors.notFound(`gamemode not enabled: ${gamemode}`)
      }
      const dto = await queueToDto(gamemode, `/api/v1/${gamemode}/queue`)
      return reply.type('application/hal+json').status(200).send(dto)
    },
  )
})
