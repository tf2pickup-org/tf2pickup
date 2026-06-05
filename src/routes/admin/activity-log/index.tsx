import z from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { activityLog } from '../../../activity-log'
import { ActivityLogPage } from '../../../admin/activity-log/views/html/activity-log.page'
import { ActivityLogEntryList } from '../../../admin/activity-log/views/html/activity-log-entry-list'
import { routes } from '../../../utils/routes'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authorize: [PlayerRole.admin],
      },
      schema: {
        querystring: z.object({
          page: z.coerce.number().int().min(1).default(1),
          sort: z.enum(['asc', 'desc']).default('desc'),
          type: z
            .enum([
              'player name change',
              'player skill change',
              'configuration change',
              'ban added',
              'ban revoked',
              'map pool change',
              'map scramble',
              'game reconfigured',
              'game server reassigned',
              'game force-ended',
              'substitute requested',
              'queue cleared',
            ])
            .optional(),
          player: z.string().optional(),
          actor: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { page, sort } = request.query
      const type = request.query.type
      const player = request.query.player
      const actor = request.query.actor

      let playerSteamIds: SteamId64[] | undefined
      if (player) {
        if (/^\d{17}$/.test(player)) {
          playerSteamIds = [player as SteamId64]
        } else {
          playerSteamIds = await activityLog.getPlayersByName(player)
          if (playerSteamIds.length === 0) {
            const emptyProps = {
              logs: [],
              playerNames: new Map<SteamId64, string>(),
              page: 1,
              totalCount: 0,
              sort,
              type,
              player,
              actor,
            }
            return reply.html(
              request.isPartialFor('activity-log-results') ? (
                <ActivityLogEntryList {...emptyProps} />
              ) : (
                <ActivityLogPage {...emptyProps} />
              ),
            )
          }
        }
      }

      let actorSteamIds: SteamId64[] | undefined
      if (actor) {
        if (/^\d{17}$/.test(actor)) {
          actorSteamIds = [actor as SteamId64]
        } else {
          actorSteamIds = await activityLog.getPlayersByName(actor)
          if (actorSteamIds.length === 0) {
            const emptyProps = {
              logs: [],
              playerNames: new Map<SteamId64, string>(),
              page: 1,
              totalCount: 0,
              sort,
              type,
              player,
              actor,
            }
            return reply.html(
              request.isPartialFor('activity-log-results') ? (
                <ActivityLogEntryList {...emptyProps} />
              ) : (
                <ActivityLogPage {...emptyProps} />
              ),
            )
          }
        }
      }

      const { logs, totalCount } = await activityLog.getLogs({
        page,
        sortOrder: sort,
        ...(type !== undefined && { typeFilter: type }),
        ...(playerSteamIds !== undefined && { playerSteamIds }),
        ...(actorSteamIds !== undefined && { actorSteamIds }),
      })

      const playerNames = await activityLog.getPlayersFor(logs)
      const props = { logs, playerNames, page, totalCount, sort, type, player, actor }

      return reply.html(
        request.isPartialFor('activity-log-results') ? (
          <ActivityLogEntryList {...props} />
        ) : (
          <ActivityLogPage {...props} />
        ),
      )
    },
  )
})
