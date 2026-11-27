import { secondsToMilliseconds } from 'date-fns'
import { requestContext } from '@fastify/request-context'
import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { PenaltiesPage } from '../../../admin/penalties/views/html/penalties.page'
import { CooldownLevelEntry } from '../../../admin/penalties/views/html/cooldown-level-entry'
import { durationUnit } from '../../../admin/games/duration-unit'
import { configuration } from '../../../configuration'
import { Tf2ClassName } from '../../../shared/types/tf2-class-name'
import { routes } from '../../../utils/routes'

// A single form field is submitted as a scalar, multiple as an array; normalize both to an array.
const formArray = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value): unknown[] => {
    if (value === undefined) return []
    return Array.isArray(value) ? (value as unknown[]) : [value]
  }, z.array(schema))

const joinQueueCooldown = z.object(
  Object.fromEntries(
    Object.values(Tf2ClassName).map(gameClass => [
      `joinQueueCooldown.${gameClass}`,
      z.coerce.number().min(0),
    ]),
  ) as Record<`joinQueueCooldown.${Tf2ClassName}`, z.ZodCoercedNumber>,
)

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  const config = { authorize: [PlayerRole.admin] }

  app
    .get('/', { config }, async (_request, reply) => {
      await reply.status(200).html(PenaltiesPage())
    })
    .post(
      '/',
      {
        config,
        schema: {
          body: z
            .object({
              'banLength[]': formArray(z.coerce.number().min(0)),
              'banLengthUnit[]': formArray(z.enum(durationUnit.all)),
              cooldownDecayPeriod: z.coerce.number().min(0),
              cooldownDecayPeriodUnit: z.enum(durationUnit.all),
            })
            .and(joinQueueCooldown)
            .refine(
              ({ 'banLength[]': length, 'banLengthUnit[]': unit }) => length.length === unit.length,
              { error: 'banLength[] and banLengthUnit[] must be of the same length' },
            ),
        },
      },
      async (request, reply) => {
        const body = request.body
        const actor = request.user!.player.steamId
        await Promise.all([
          configuration.set(
            'games.cooldown_levels',
            body['banLength[]'].map((value, i) => ({
              level: i,
              banLengthMs: durationUnit.toMs(value, body['banLengthUnit[]'][i]!),
            })),
            actor,
          ),
          configuration.set(
            'games.cooldown_decay_period',
            durationUnit.toMs(body.cooldownDecayPeriod, body.cooldownDecayPeriodUnit),
            actor,
          ),
          configuration.set(
            'games.join_queue_cooldown',
            Object.fromEntries(
              Object.values(Tf2ClassName).map(gameClass => [
                gameClass,
                secondsToMilliseconds(body[`joinQueueCooldown.${gameClass}`]),
              ]),
            ) as Record<Tf2ClassName, number>,
            actor,
          ),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(PenaltiesPage())
      },
    )
    .post('/cooldown-level', { config }, async (_request, reply) => {
      return await reply.send(CooldownLevelEntry({ banLengthMs: 0 }))
    })
})
