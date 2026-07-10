import { PlayerRole } from '../../../database/models/player.model'
import { PlayerRestrictionsPage } from '../../../admin/player-restrictions/views/html/player-restrictions.page'
import { DefaultPlayerSkill } from '../../../admin/player-restrictions/views/html/default-player-skill'
import { z } from 'zod'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'
import { getQueueConfig } from '../../../queue-auto/configs'
import { Gamemode } from '../../../shared/types/gamemode'
import { defaultGamemode } from '../../../shared/enabled-gamemodes'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'

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
      async (_request, reply) => {
        await reply.status(200).html(PlayerRestrictionsPage())
      },
    )
    .get(
      '/default-player-skill',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          querystring: z.object({
            gamemode: z.enum(Gamemode).optional(),
          }),
        },
      },
      async (request, reply) => {
        await reply
          .status(200)
          .html(DefaultPlayerSkill({ gamemode: request.query.gamemode ?? defaultGamemode }))
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
              requirePlayerVerification: z.coerce.boolean().default(false),
              skillSuggestions: z.coerce.boolean().default(false),
              skillStep: z.coerce.number().positive(),
              defaultPlayerSkillGamemode: z.enum(Gamemode).default(defaultGamemode),
              ...Object.values(Tf2ClassName).reduce<
                Partial<Record<`defaultPlayerSkill.${Tf2ClassName}`, z.ZodOptional<z.ZodNumber>>>
              >(
                (acc, key) => ({
                  ...acc,
                  [`defaultPlayerSkill.${key}`]: z.coerce.number().optional(),
                }),
                {},
              ),
            }),
          ),
        },
      },
      async (request, reply) => {
        const {
          etf2lAccountRequired,
          minimumInGameHours,
          requirePlayerVerification,
          playerSkillThresholdEnabled,
          skillSuggestions,
          skillStep,
          defaultPlayerSkillGamemode,
        } = request.body
        const classes = new Set<string>(
          getQueueConfig(defaultPlayerSkillGamemode).classes.map(({ name }) => name),
        )
        const defaultPlayerSkill = Object.entries(request.body)
          .filter(([key]) => key.startsWith('defaultPlayerSkill.'))
          .map(([key, value]) => [key.split('.')[1]!, value] as const)
          .filter(([className, value]) => classes.has(className) && typeof value === 'number')
          .reduce<Partial<Record<Tf2ClassName, number>>>(
            (acc, [className, value]) => ({ ...acc, [className]: value }),
            {},
          )

        const actor = request.user!.player.steamId
        await Promise.all([
          configuration.set('players.etf2l_account_required', etf2lAccountRequired, actor),
          configuration.set('players.minimum_in_game_hours', minimumInGameHours, actor),
          configuration.set('queue.require_player_verification', requirePlayerVerification, actor),
          configuration.set(
            'queue.player_skill_threshold',
            playerSkillThresholdEnabled ? request.body.playerSkillThreshold : null,
            actor,
          ),
          configuration.set(
            'games.default_player_skill',
            defaultPlayerSkill,
            actor,
            defaultPlayerSkillGamemode,
          ),
          configuration.set('games.skill_step', skillStep, actor),
          configuration.set('games.skill_suggestions', skillSuggestions, actor),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply
          .status(200)
          .html(PlayerRestrictionsPage({ gamemode: defaultPlayerSkillGamemode }))
      },
    )
})
