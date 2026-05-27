import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { configuration } from '../../../configuration'
import { requestContext } from '@fastify/request-context'
import { AgentPage } from '../../../admin/agent/views/html/agent.page'
import { routes } from '../../../utils/routes'

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
        reply.status(200).html(await AgentPage())
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
            skillSupervisor: z
              .literal('true')
              .optional()
              .transform(v => v === 'true'),
            dailyTokenBudget: z
              .union([z.literal('').transform(() => null), z.coerce.number().int().positive()])
              .nullable()
              .default(null),
          }),
        },
      },
      async (request, reply) => {
        const { skillSupervisor, dailyTokenBudget } = request.body
        await Promise.all([
          configuration.set('agent.skill_supervisor', skillSupervisor),
          configuration.set('agent.daily_token_budget', dailyTokenBudget),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await AgentPage())
      },
    )
})
