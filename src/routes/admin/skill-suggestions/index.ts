import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { SkillSuggestionsPage } from '../../../admin/skill-suggestions/views/html/skill-suggestions.page'
import { configuration } from '../../../configuration'
import { players } from '../../../players'
import { queue } from '../../../queue-auto'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { recordSkillSuggestionUsage } from '../../../telemetry/record-skill-suggestion-usage'
import { routes } from '../../../utils/routes'
import { safe } from '../../../utils/safe'
import { requestContext } from '@fastify/request-context'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        await reply.status(200).html(SkillSuggestionsPage())
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            steamId: steamId64,
            gameClass: z.enum(Tf2ClassName),
            direction: z.enum(['up', 'down']),
          }),
        },
      },
      async (request, reply) => {
        const { steamId, gameClass, direction } = request.body
        const [player, defaultSkill, skillStep] = await Promise.all([
          players.bySteamId(steamId, ['steamId', 'name', 'skill', 'elo', 'stats', 'skillHistory']),
          configuration.get('games.default_player_skill'),
          configuration.get('games.skill_step'),
        ])

        const skill = Object.fromEntries(
          queue.config.classes.map(({ name }) => [
            name,
            player.skill?.[name] ?? defaultSkill[name] ?? 0,
          ]),
        ) as Partial<Record<Tf2ClassName, number>>
        skill[gameClass] = (skill[gameClass] ?? 0) + (direction === 'up' ? skillStep : -skillStep)

        await players.setSkill({
          steamId,
          skill,
          actor: request.user!.player.steamId,
        })
        safe(() =>
          recordSkillSuggestionUsage({ player, oldSkill: player.skill ?? {}, newSkill: skill }),
        )()

        requestContext.set('messages', {
          success: [`${player.name}'s ${gameClass} skill updated`],
        })
        await reply.status(200).html(SkillSuggestionsPage())
      },
    )
})
