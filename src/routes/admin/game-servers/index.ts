import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { GameServersPage } from '../../../admin/game-servers/views/html/game-servers.page'
import { durationUnit } from '../../../admin/games/duration-unit'
import { configuration } from '../../../configuration'
import { HideServerInfoMode } from '../../../shared/types/hide-server-info-mode'
import { routes } from '../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get('/', { config: { authorize: [PlayerRole.admin] } }, async (_request, reply) => {
      await reply.status(200).html(GameServersPage())
    })
    .post(
      '/',
      {
        config: { authorize: [PlayerRole.admin] },
        schema: {
          // serveme.tf and TF2 QuickServer fields are only there when those are enabled
          body: z.object({
            hideServerInfoMode: z.enum(HideServerInfoMode),
            servemeTfPreferredRegion: z
              .string()
              .transform(value => (value === 'none' ? null : value))
              .optional(),
            servemeTfPreferredGameserver: z
              .string()
              .trim()
              .transform(value => value || null)
              .optional(),
            tf2QuickServerRegion: z.string().optional(),
            tf2QuickServerTimeout: z.coerce.number().positive().optional(),
            tf2QuickServerTimeoutUnit: z.enum(durationUnit.all).default('minutes'),
          }),
        },
      },
      async (request, reply) => {
        const body = request.body
        const actor = request.user!.player.steamId
        await configuration.set(
          'games.hide_server_info_from_spectators',
          body.hideServerInfoMode,
          actor,
        )
        if (body.servemeTfPreferredRegion !== undefined) {
          await configuration.set(
            'serveme_tf.preferred_region',
            body.servemeTfPreferredRegion,
            actor,
          )
        }
        if (body.servemeTfPreferredGameserver !== undefined) {
          await configuration.set(
            'serveme_tf.preferred_gameserver',
            body.servemeTfPreferredGameserver,
            actor,
          )
        }
        if (body.tf2QuickServerRegion !== undefined) {
          await configuration.set('tf2_quick_server.region', body.tf2QuickServerRegion, actor)
        }
        if (body.tf2QuickServerTimeout !== undefined) {
          await configuration.set(
            'tf2_quick_server.timeout',
            durationUnit.toMs(body.tf2QuickServerTimeout, body.tf2QuickServerTimeoutUnit),
            actor,
          )
        }
        request.flash('success', 'Configuration saved')
        await reply.redirect('/admin/game-servers')
      },
    )
})
