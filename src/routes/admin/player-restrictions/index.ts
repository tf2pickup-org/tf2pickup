import { PlayerRole } from '../../../database/models/player.model'
import { PlayerRestrictionsPage } from '../../../admin/player-restrictions/views/html/player-restrictions.page'
import { z } from 'zod'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'
import { queue } from '../../../queue'
import type { Tf2ClassName } from '../../../shared/types/tf2-class-name'

const playerSkillThresholdSchema = z.discriminatedUnion('playerSkillThresholdEnabled', [
  z.object({
    playerSkillThresholdEnabled: z.literal(false).optional(),
  }),
  z.object({
    playerSkillThresholdEnabled: z.literal('enabled'),
    playerSkillThreshold: z.coerce.number(),
  }),
])

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
      async (request, reply) => {
        reply.status(200).html(await PlayerRestrictionsPage({ user: request.user! }))
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.intersection(
            playerSkillThresholdSchema,
            z.object({
              etf2lAccountRequired: z.coerce.boolean().default(false),
              minimumInGameHours: z.coerce.number(),
              denyPlayersWithNoSkillAssigned: z.coerce.boolean().default(false),
              ...queue.config.classes
                .map(({ name }) => name)
                .reduce<
                  Partial<Record<`defaultPlayerSkill.${Tf2ClassName}`, z.ZodNumber>>
                >((acc, key) => ({ ...acc, [`defaultPlayerSkill.${key}`]: z.coerce.number() }), {}),
            }),
          ),
        },
      },
      async (request, reply) => {
        const {
          etf2lAccountRequired,
          minimumInGameHours,
          denyPlayersWithNoSkillAssigned,
          playerSkillThresholdEnabled,
        } = request.body
        const defaultPlayerSkill = Object.entries(request.body)
          .filter(([key]) => key.startsWith('defaultPlayerSkill.'))
          .reduce<Partial<Record<Tf2ClassName, number>>>(
            (acc, [key, value]) => ({ ...acc, [key.split('.')[1] as Tf2ClassName]: value }),
            {},
          )

        await Promise.all([
          configuration.set('players.etf2l_account_required', etf2lAccountRequired),
          configuration.set('players.minimum_in_game_hours', minimumInGameHours),
          configuration.set(
            'queue.deny_players_with_no_skill_assigned',
            denyPlayersWithNoSkillAssigned,
          ),
          configuration.set(
            'queue.player_skill_threshold',
            playerSkillThresholdEnabled ? request.body.playerSkillThreshold : null,
          ),
          configuration.set('games.default_player_skill', defaultPlayerSkill),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await PlayerRestrictionsPage({ user: request.user! }))
      },
    )
})
