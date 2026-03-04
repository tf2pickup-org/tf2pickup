import { PlayerRole } from '../../../../../../database/models/player.model'
import { z } from 'zod'
import { players } from '../../../../../../players'
import { AddChatMutePage } from '../../../../../../players/views/html/add-chat-mute.page'
import { steamId64 } from '../../../../../../shared/schemas/steam-id-64'
import { banExpiryFormSchema } from '../../../../../../players/schemas/ban-expiry-form.schema'
import { routes } from '../../../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            steamId: steamId64,
          }),
        },
      },
      async (request, reply) => {
        const { steamId } = request.params
        reply.status(200).html(await AddChatMutePage({ steamId }))
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            steamId: steamId64,
          }),
          body: z.intersection(
            banExpiryFormSchema,
            z.object({
              reason: z.string(),
            }),
          ),
        },
      },
      async (request, reply) => {
        await players.addChatMute({
          player: request.params.steamId,
          admin: request.user!.player.steamId,
          end: players.getBanExpiryDate(request.body),
          reason: request.body.reason,
        })
        request.flash('success', `Player chat mute added`)
        reply.redirect(`/players/${request.params.steamId}/edit/chat-mutes`)
      },
    )
})
