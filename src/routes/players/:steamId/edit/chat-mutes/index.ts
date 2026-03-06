import { PlayerRole } from '../../../../../database/models/player.model'
import { z } from 'zod'
import { players } from '../../../../../players'
import { steamId64 } from '../../../../../shared/schemas/steam-id-64'
import {
  ChatMuteDetails,
  EditPlayerChatMutesPage,
} from '../../../../../players/views/html/edit-player.page'
import { routes } from '../../../../../utils/routes'

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
      async (req, reply) => {
        const { steamId } = req.params
        reply.status(200).html(await EditPlayerChatMutesPage({ steamId }))
      },
    )
    .put(
      '/:muteStart/revoke',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            steamId: steamId64,
            muteStart: z.coerce.number().transform(value => new Date(value)),
          }),
        },
      },
      async (request, reply) => {
        const { steamId, muteStart } = request.params
        const player = await players.bySteamId(steamId, ['name', 'steamId'])
        const chatMute = await players.revokeChatMute({
          player: steamId,
          muteStart,
          admin: request.user!.player.steamId,
        })
        reply.status(200).html(await ChatMuteDetails({ player, chatMute }))
      },
    )
})
