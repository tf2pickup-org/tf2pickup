import { PlayerRole } from '../../../database/models/player.model'
import { z } from 'zod'
import { collections } from '../../../database/collections'
import { steamId64 } from '../../../shared/schemas/steam-id-64'
import { configuration } from '../../../configuration'
import { BypassedSteamIds } from '../../../admin/registration/views/html/bypassed-steam-ids'
import { routes } from '../../../utils/routes'
import { FlashMessage } from '../../../html/components/flash-message'

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
        await reply.redirect('/admin/registration', 301)
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({ steamId: steamId64 }),
        },
      },
      async (request, reply) => {
        const { steamId } = request.body
        // with htmx only the list is updated, so unsaved edits elsewhere on the page survive
        const respond = async (type: 'success' | 'error', message: string) => {
          if (request.isHtmx()) {
            return reply.html(
              <>
                <BypassedSteamIds />
                <FlashMessage type={type} message={message} />
              </>,
            )
          }
          request.flash(type, message)
          return reply.redirect('/admin/registration')
        }

        if ((await collections.players.countDocuments({ steamId })) > 0) {
          return respond('error', 'Player is already registered')
        }

        const config = await configuration.get('players.bypass_registration_restrictions')
        if (config.some(c => c === steamId)) {
          return respond('error', 'This Steam ID is already added')
        }

        await configuration.set(
          'players.bypass_registration_restrictions',
          [...config, steamId],
          request.user!.player.steamId,
        )
        return respond('success', 'Steam ID added')
      },
    )
    .delete(
      '/:steamId',
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
        const config = await configuration.get('players.bypass_registration_restrictions')
        await configuration.set(
          'players.bypass_registration_restrictions',
          config.filter(c => c !== steamId),
          request.user!.player.steamId,
        )
        return reply.html(BypassedSteamIds())
      },
    )
})
