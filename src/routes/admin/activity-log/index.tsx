import z from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { getActivityLogs } from '../../../activity-log/get-logs'
import { getPlayersForActivityLogs } from '../../../activity-log/get-players-for-logs'
import { getPlayersByNameForActivityLog } from '../../../activity-log/get-players-by-name'
import { ActivityLogPage } from '../../../admin/activity-log/views/html/activity-log.page'
import { ActivityLogEntryList } from '../../../admin/activity-log/views/html/activity-log-entry-list'
import { routes } from '../../../utils/routes'
import type { SteamId64 } from '../../../shared/types/steam-id-64'
import type { ActivityLogEntryType } from '../../../database/models/activity-log-entry.model'

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
          page: z.coerce.number().default(1),
          sort: z.enum(['asc', 'desc']).default('desc'),
          type: z.string().optional(),
          player: z.string().optional(),
          actor: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { page, sort } = request.query
      const type = (request.query.type ?? undefined) as ActivityLogEntryType | undefined
      const player = request.query.player ?? undefined
      const actor = request.query.actor ?? undefined

      let playerSteamIds: SteamId64[] | undefined
      if (player) {
        if (/^\d{17}$/.test(player)) {
          playerSteamIds = [player as SteamId64]
        } else {
          playerSteamIds = await getPlayersByNameForActivityLog(player)
          if (playerSteamIds.length === 0) {
            const emptyProps = {
              logs: [],
              playerNames: new Map() as Map<SteamId64, string>,
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
          actorSteamIds = await getPlayersByNameForActivityLog(actor)
          if (actorSteamIds.length === 0) {
            const emptyProps = {
              logs: [],
              playerNames: new Map() as Map<SteamId64, string>,
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

      const { logs, totalCount } = await getActivityLogs({
        page,
        sortOrder: sort,
        ...(type !== undefined && { typeFilter: type }),
        ...(playerSteamIds !== undefined && { playerSteamIds }),
        ...(actorSteamIds !== undefined && { actorSteamIds }),
      })

      const playerNames = await getPlayersForActivityLogs(logs)
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
