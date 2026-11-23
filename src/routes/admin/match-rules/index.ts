import { requestContext } from '@fastify/request-context'
import { z } from 'zod'
import { durationUnit } from '../../../admin/games/duration-unit'
import { MatchRulesPage } from '../../../admin/match-rules/views/html/match-rules.page'
import { configuration } from '../../../configuration'
import { PlayerRole } from '../../../database/models/player.model'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get('/', { config: { authorize: [PlayerRole.admin] } }, async (_request, reply) => {
      await reply.status(200).html(MatchRulesPage())
    })
    .post(
      '/',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          body: z.object({
            joinGameserverTimeout: z.coerce.number().min(0),
            joinGameserverTimeoutUnit: z.enum(durationUnit.all),
            rejoinGameserverTimeout: z.coerce.number().min(0),
            rejoinGameserverTimeoutUnit: z.enum(durationUnit.all),
            autoForceEndThreshold: z.coerce.number().int().min(0),
          }),
        },
      },
      async (request, reply) => {
        const body = request.body
        const actor = request.user!.player.steamId
        await Promise.all([
          configuration.set(
            'games.join_gameserver_timeout',
            durationUnit.toMs(body.joinGameserverTimeout, body.joinGameserverTimeoutUnit),
            actor,
          ),
          configuration.set(
            'games.rejoin_gameserver_timeout',
            durationUnit.toMs(body.rejoinGameserverTimeout, body.rejoinGameserverTimeoutUnit),
            actor,
          ),
          configuration.set('games.auto_force_end_threshold', body.autoForceEndThreshold, actor),
        ])
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(MatchRulesPage())
      },
    )
})
