import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlayerSettingsPage } from '../../players/views/html/player-settings.page'
import { z } from 'zod'
import { players } from '../../players'
import type { PlayerPreferences } from '../../database/models/player.model'

// eslint-disable-next-line @typescript-eslint/require-await
export default async function (app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get(
      '/',
      {
        config: {
          authenticate: true,
        },
      },
      async (req, reply) => {
        await reply.status(200).html(PlayerSettingsPage({ user: req.user! }))
      },
    )
    .post(
      '/',
      {
        config: {
          authenticate: true,
        },
        schema: {
          body: z.object({
            soundVolume: z.coerce.number().min(0).max(1),
          }),
        },
      },
      async (req, reply) => {
        const player = await players.bySteamId(req.user!.player.steamId)
        const preferences: PlayerPreferences = {
          soundVolume: req.body.soundVolume,
        }
        await players.update(player.steamId, { $set: { preferences } })
        req.flash('success', `Settings saved`)
        await reply.redirect(`/settings`)
      },
    )
}
