import { PlayerRole } from '../database/models/player.model'
import { z } from 'zod'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { routes } from '../utils/routes'
import { bySteamId } from './by-steam-id'
import { revoke } from './restrictions/revoke'
import type { RestrictionKind } from './restrictions/restriction-kind'
import { EditPlayerRestrictionsPage, RestrictionDetails } from './views/html/edit-player.page'
import { restrictionActors } from './views/html/restriction-actors'

export function restrictionRoutes(kind: RestrictionKind) {
  // eslint-disable-next-line @typescript-eslint/require-await
  return routes(async app => {
    app
      .get(
        '/',
        {
          config: { authorize: [PlayerRole.admin] },
          schema: { params: z.object({ steamId: steamId64 }) },
        },
        async (request, reply) => {
          const { steamId } = request.params
          await reply.status(200).html(EditPlayerRestrictionsPage({ steamId, kind }))
        },
      )
      .put(
        '/:start/revoke',
        {
          config: { authorize: [PlayerRole.admin] },
          schema: {
            params: z.object({
              steamId: steamId64,
              start: z.coerce.number().transform(value => new Date(value)),
            }),
          },
        },
        async (request, reply) => {
          const { steamId, start } = request.params
          const player = await bySteamId(steamId, ['steamId', 'etf2lProfile'])
          const restriction = await revoke(kind, {
            player: steamId,
            start,
            actor: request.user!.player.steamId,
          })
          const actors = await restrictionActors([restriction])
          await reply.status(200).html(RestrictionDetails({ player, kind, restriction, actors }))
        },
      )
  })
}
