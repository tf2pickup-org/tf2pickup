import z from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { getLogs } from '../../../admin/player-action-logs/get-logs'
import { getPlayersByName } from '../../../admin/player-action-logs/get-players-by-name'
import { getPlayersForLogs } from '../../../admin/player-action-logs/get-players-for-logs'
import { PlayerActionLogsPage } from '../../../admin/player-action-logs/views/html/player-action-logs.page'
import { LogEntryList } from '../../../admin/player-action-logs/views/html/log-entry-list'
import { routes } from '../../../utils/routes'
import type { SteamId64 } from '../../../shared/types/steam-id-64'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app.get(
    '/',
    {
      config: {
        authorize: [PlayerRole.superUser],
      },
      schema: {
        querystring: z.object({
          page: z.coerce.number().default(1),
          sort: z.enum(['asc', 'desc']).default('desc'),
          action: z.string().optional(),
          player: z.string().optional(),
          ip: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { page, sort } = request.query
      const action = request.query.action ?? undefined
      const player = request.query.player ?? undefined
      const ip = request.query.ip ?? undefined

      // Resolve player filter
      let playerSteamIds: SteamId64[] | undefined
      if (player) {
        if (/^\d{17}$/.test(player)) {
          playerSteamIds = [player as SteamId64]
        } else {
          playerSteamIds = await getPlayersByName(player)
          if (playerSteamIds.length === 0) {
            // No matching players — return empty results
            const emptyProps = {
              logs: [],
              playerNames: new Map() as Map<SteamId64, string>,
              page: 1,
              totalCount: 0,
              sort,
              action,
              player,
              ip,
            }
            return reply.html(
              request.isPartialFor('log-results') ? (
                <LogEntryList {...emptyProps} />
              ) : (
                <PlayerActionLogsPage {...emptyProps} />
              ),
            )
          }
        }
      }

      const { logs, totalCount } = await getLogs({
        page,
        sortOrder: sort,
        ...(action !== undefined && { actionFilter: action }),
        ...(playerSteamIds !== undefined && { playerSteamIds }),
        ...(ip !== undefined && { ipAddress: ip }),
      })

      const playerNames = await getPlayersForLogs(logs)

      const props = { logs, playerNames, page, totalCount, sort, action, player, ip }

      return reply.html(
        request.isPartialFor('log-results') ? (
          <LogEntryList {...props} />
        ) : (
          <PlayerActionLogsPage {...props} />
        ),
      )
    },
  )
})
