import z from 'zod'
import { PlayerRole } from '../../../../../database/models/player.model'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { players } from '../../../../../players'
import { EditPlayerProfilePage } from '../../../../../players/views/html/edit-player.page'
import { Tf2ClassName } from '../../../../../shared/types/tf2-class-name'
import { routes } from '../../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            steamId: steamId64,
          }),
        },
      },
      async (req, reply) => {
        const { steamId } = req.params
        const player = await players.bySteamId(steamId)
        reply.status(200).html(await EditPlayerProfilePage({ player, user: req.user! }))
      },
    )
    .post(
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
            name: z.string(),
            ...Object.keys(Tf2ClassName).reduce<
              Partial<Record<`skill.${Tf2ClassName}`, z.ZodNumber>>
            >((acc, key) => ({ ...acc, [`skill.${key}`]: z.coerce.number().optional() }), {}),
          }),
        },
      },
      async (req, reply) => {
        const { steamId } = req.params
        const { name } = req.body
        const player = await players.bySteamId(steamId)
        const skill = Object.entries(req.body)
          .filter(([key]) => key.startsWith('skill.'))
          .reduce<Partial<Record<Tf2ClassName, number>>>(
            (acc, [key, value]) => ({ ...acc, [key.split('.')[1] as Tf2ClassName]: value }),
            {},
          )

        await players.update(
          player.steamId,
          { $set: { name, skill } },
          {},
          req.user!.player.steamId,
        )
        req.flash('success', `Player updated`)
        await reply.redirect(`/players/${steamId}`)
      },
    )
})
