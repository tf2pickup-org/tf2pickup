import { PlayerRole } from '../../../database/models/player.model'
import { PlayerRestrictionsPage } from '../../../admin/player-restrictions/views/html/player-restrictions.page'
import { z } from 'zod'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'

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
            }),
          ),
        },
      },
      async (request, reply) => {
        await Promise.all([
          configuration.set('players.etf2l_account_required', request.body.etf2lAccountRequired),
          configuration.set('players.minimum_in_game_hours', request.body.minimumInGameHours),
          configuration.set(
            'queue.deny_players_with_no_skill_assigned',
            request.body.denyPlayersWithNoSkillAssigned,
          ),
          configuration.set(
            'queue.player_skill_threshold',
            request.body.playerSkillThresholdEnabled ? request.body.playerSkillThreshold : null,
          ),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await PlayerRestrictionsPage({ user: request.user! }))
      },
    )
})
