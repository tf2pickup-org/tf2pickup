import { PlayerRole } from '../../../../../database/models/player.model'
import { z } from 'zod'
import { queue } from '../../../../../queue'
import type { Tf2ClassName } from '../../../../../shared/types/tf2-class-name'
import { players } from '../../../../../players'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { routes } from '../../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.post(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params: z.object({
          steamId: steamId64,
        }),
        body: z.object({
          ...queue.config.classes
            .map(({ name }) => name)
            .reduce<
              Partial<Record<`skill.${Tf2ClassName}`, z.ZodNumber>>
            >((acc, key) => ({ ...acc, [`skill.${key}`]: z.coerce.number() }), {}),
        }),
      },
    },
    async (request, reply) => {
      const { steamId } = request.params
      const player = await players.bySteamId(steamId, ['steamId'])
      const skill = Object.entries(request.body)
        .filter(([key]) => key.startsWith('skill.'))
        .reduce<Partial<Record<Tf2ClassName, number>>>(
          (acc, [key, value]) => ({ ...acc, [key.split('.')[1] as Tf2ClassName]: value }),
          {},
        )
      await players.setSkill({
        steamId: player.steamId,
        skill,
        actor: request.user!.player.steamId,
      })
      request.flash('success', `Player skill updated`)
      await reply.redirect(`/players/${steamId}`)
    },
  )
})
