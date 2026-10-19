import { gamemodeConfigs } from '../../../../../gamemodes/configs'
import { PlayerRole, type PlayerSkill } from '../../../../../database/models/player.model'
import { Gamemode } from '../../../../../shared/types/gamemode'
import { z } from 'zod'
import { players } from '../../../../../players'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { routes } from '../../../../../utils/routes'
import { AdminToolbox } from '../../../../../players/views/html/admin-toolbox'
import { recordSkillSuggestionUsage } from '../../../../../telemetry/record-skill-suggestion-usage'
import { safe } from '../../../../../utils/safe'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.delete(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params: z.object({
          steamId: steamId64,
        }),
        querystring: z.object({ gamemode: z.enum(Gamemode) }),
      },
    },
    async (request, reply) => {
      const { steamId } = request.params
      await players.update(
        steamId,
        { $unset: { [`skill.${request.query.gamemode}`]: '' } },
        {},
        request.user!.player.steamId,
      )
      const player = await players.bySteamId(steamId, [
        'steamId',
        'skill',
        'skillHistory',
        'verified',
        'elo',
        'stats',
      ])
      await reply.html(AdminToolbox({ player }))
    },
  )

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
        body: z.looseObject({ gamemode: z.enum(Gamemode) }),
      },
    },
    async (request, reply) => {
      const { steamId } = request.params
      const player = await players.bySteamId(steamId, [
        'steamId',
        'skill',
        'elo',
        'stats',
        'skillHistory',
      ])
      const { gamemode } = request.body
      const oldSkill = player.skill?.[gamemode] ?? {}
      const skill: PlayerSkill = Object.fromEntries(
        gamemodeConfigs[gamemode].classes.map(({ name }) => [
          name,
          z.coerce.number().parse(request.body[`skill.${name}`]),
        ]),
      )
      await players.setSkill({
        steamId: player.steamId,
        gamemode,
        skill,
        actor: request.user!.player.steamId,
      })
      safe(() =>
        recordSkillSuggestionUsage({
          player,
          gamemode,
          oldSkill,
          newSkill: skill,
        }),
      )()
      request.flash('success', `Player skill updated`)
      await reply.redirect(`/players/${steamId}`)
    },
  )
})
