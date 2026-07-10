import { PlayerRole } from '../../../../../database/models/player.model'
import { z } from 'zod'
import type { Tf2ClassName } from '../../../../../shared/types/tf2-class-name'
import { Gamemode } from '../../../../../shared/types/gamemode'
import { defaultGamemode } from '../../../../../shared/enabled-gamemodes'
import { getQueueConfig } from '../../../../../queue-auto/configs'
import { players } from '../../../../../players'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import { routes } from '../../../../../utils/routes'
import { AdminToolboxSkill } from '../../../../../players/views/html/admin-toolbox-skill'
import { recordSkillSuggestionUsage } from '../../../../../telemetry/record-skill-suggestion-usage'
import { safe } from '../../../../../utils/safe'

const params = z.object({
  steamId: steamId64,
})

const querystring = z.object({
  gamemode: z.enum(Gamemode).optional(),
})

const playerProjection = ['steamId', 'skill', 'skillHistory', 'elo', 'stats'] as const

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params,
        querystring,
      },
    },
    async (request, reply) => {
      const player = await players.bySteamId(request.params.steamId, [...playerProjection])
      await reply.html(
        AdminToolboxSkill({ player, gamemode: request.query.gamemode ?? defaultGamemode }),
      )
    },
  )

  app.delete(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params,
        querystring,
      },
    },
    async (request, reply) => {
      const { steamId } = request.params
      const gamemode = request.query.gamemode ?? defaultGamemode
      await players.update(
        steamId,
        { $unset: { [`skill.${gamemode}`]: '' } },
        {},
        request.user!.player.steamId,
      )
      const player = await players.bySteamId(steamId, [...playerProjection])
      await reply.html(AdminToolboxSkill({ player, gamemode }))
    },
  )

  app.post(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        params,
        querystring,
        body: z.record(z.string().startsWith('skill.'), z.coerce.number()),
      },
    },
    async (request, reply) => {
      const { steamId } = request.params
      const gamemode = request.query.gamemode ?? defaultGamemode
      const player = await players.bySteamId(steamId, [
        'steamId',
        'skill',
        'elo',
        'stats',
        'skillHistory',
      ])
      const classes = new Set<string>(getQueueConfig(gamemode).classes.map(({ name }) => name))
      const oldSkill = player.skill?.[gamemode] ?? {}
      const skill = Object.entries(request.body)
        .map(([key, value]) => [key.split('.')[1]!, value] as const)
        .filter(([className]) => classes.has(className))
        .reduce<Partial<Record<Tf2ClassName, number>>>(
          (acc, [className, value]) => ({ ...acc, [className]: value }),
          {},
        )
      await players.setSkill({
        steamId: player.steamId,
        skill,
        actor: request.user!.player.steamId,
        gamemode,
      })
      safe(() => recordSkillSuggestionUsage({ player, oldSkill, newSkill: skill, gamemode }))()
      request.flash('success', `Player skill updated`)
      await reply.redirect(`/players/${steamId}?gamemode=${gamemode}`)
    },
  )
})
