import { PlayerRole } from '../database/models/player.model'
import { z } from 'zod'
import { steamId64 } from '../shared/schemas/steam-id-64'
import { routes } from '../utils/routes'
import { getBanExpiryDate } from './get-ban-expiry-date'
import { add } from './restrictions/add'
import type { RestrictionKind } from './restrictions/restriction-kind'
import { banExpiryFormSchema } from './schemas/ban-expiry-form.schema'
import { AddRestrictionPage } from './views/html/add-restriction.page'
import { restrictionLabels } from './views/html/restriction-labels'

export function addRestrictionRoutes(kind: RestrictionKind) {
  const labels = restrictionLabels[kind]
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
          await reply.status(200).html(AddRestrictionPage({ steamId, kind }))
        },
      )
      .post(
        '/',
        {
          config: { authorize: [PlayerRole.admin] },
          schema: {
            params: z.object({ steamId: steamId64 }),
            body: z.intersection(
              banExpiryFormSchema,
              z.object({
                reason: z.string(),
                // browsers omit an unchecked checkbox from the request body
                anonymous: z.coerce.boolean().default(false),
              }),
            ),
          },
        },
        async (request, reply) => {
          await add(kind, {
            player: request.params.steamId,
            actor: request.user!.player.steamId,
            end: getBanExpiryDate(request.body),
            reason: request.body.reason,
            anonymous: kind === 'ban' && request.body.anonymous,
          })
          request.flash('success', `Player ${labels.noun} added`)
          await reply.redirect(`/players/${request.params.steamId}/edit/${labels.path}`)
        },
      )
  })
}
