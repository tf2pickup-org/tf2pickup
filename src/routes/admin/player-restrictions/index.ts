import { PlayerRole } from '../../../database/models/player.model'
import { PlayerRestrictionsPage } from '../../../admin/player-restrictions/views/html/player-restrictions.page'
import { z } from 'zod'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { Gamemode } from '../../../shared/types/gamemode'

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
        await reply.status(200).html(PlayerRestrictionsPage())
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.looseObject({
            etf2lAccountRequired: z.coerce.boolean().default(false),
            minimumInGameHours: z.coerce.number(),
            skillSuggestions: z.coerce.boolean().default(false),
            skillStep: z.coerce.number().positive(),
          }),
        },
      },
      async (request, reply) => {
        const { etf2lAccountRequired, minimumInGameHours, skillSuggestions, skillStep } =
          request.body
        const defaultPlayerSkill = await configuration.get('games.default_player_skill')
        for (const [key, value] of Object.entries(request.body)) {
          const [, gamemode, gameClass] = /^defaultPlayerSkill\.([^.]+)\.([^.]+)$/.exec(key) ?? []
          const gamemodeSkill = z.enum(Gamemode).safeParse(gamemode)
          const skillClass = z.enum(Tf2ClassName).safeParse(gameClass)
          if (gamemodeSkill.success && skillClass.success) {
            defaultPlayerSkill[gamemodeSkill.data] = {
              ...defaultPlayerSkill[gamemodeSkill.data],
              [skillClass.data]: z.coerce.number().parse(value),
            }
          }
        }

        const actor = request.user!.player.steamId
        await Promise.all([
          configuration.set('players.etf2l_account_required', etf2lAccountRequired, actor),
          configuration.set('players.minimum_in_game_hours', minimumInGameHours, actor),
          configuration.set('games.default_player_skill', defaultPlayerSkill, actor),
          configuration.set('games.skill_step', skillStep, actor),
          configuration.set('games.skill_suggestions', skillSuggestions, actor),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(PlayerRestrictionsPage())
      },
    )
})
