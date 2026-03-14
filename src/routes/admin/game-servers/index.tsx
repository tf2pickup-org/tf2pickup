import { PlayerRole } from '../../../database/models/player.model'
import { GameServersPage } from '../../../admin/game-servers/views/html/game-servers.page'
import { HealthcheckModal } from '../../../static-game-servers/views/html/healthcheck-modal'
import { collections } from '../../../database/collections'
import {
  createCheck,
  getCheck,
  getActiveCheckId,
} from '../../../static-game-servers/healthcheck-store'
import { runHealthcheck } from '../../../static-game-servers/run-healthcheck'
import { errors } from '../../../errors'
import { z } from 'zod'
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
        await reply.status(200).html(GameServersPage())
      },
    )
    .post(
      '/:id/healthcheck',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          params: z.object({ id: z.string() }),
        },
      },
      async (request, reply) => {
        const { id } = request.params
        const server = await collections.staticGameServers.findOne({ id })
        if (server === null) {
          throw errors.notFound(`game server not found: ${id}`)
        }
        if (!server.isOnline || server.game !== undefined) {
          throw errors.badRequest('server is not available for healthcheck')
        }

        // Return existing check if one is already running
        const existingCheckId = getActiveCheckId(id)
        if (existingCheckId !== undefined) {
          const existingResult = getCheck(existingCheckId)
          if (existingResult !== undefined) {
            return reply.html(
              HealthcheckModal({ result: existingResult, checkId: existingCheckId, server }),
            )
          }
        }

        const checkId = createCheck(id)
        void runHealthcheck(server, checkId)
        const result = getCheck(checkId)!
        return reply.html(HealthcheckModal({ result, checkId, server }))
      },
    )
    .get(
      '/healthcheck/:checkId',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          params: z.object({ checkId: z.string() }),
        },
      },
      async (request, reply) => {
        const { checkId } = request.params
        const result = getCheck(checkId)

        if (result === undefined) {
          return reply.html(
            <div class="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white/40">
              Check expired — please try again.
            </div>,
          )
        }

        const server = await collections.staticGameServers.findOne({ id: result.serverId })
        if (server === null) {
          throw errors.notFound(`game server not found: ${result.serverId}`)
        }

        return reply.html(HealthcheckModal({ result, checkId, server }))
      },
    )
})
