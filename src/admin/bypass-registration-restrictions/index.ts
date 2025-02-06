import fp from 'fastify-plugin'
import { z } from 'zod'
import { BypassRegistrationRestrictionsPage } from './views/html/bypass-registration-restrictions.page'
import { steamId64 } from '../../shared/schemas/steam-id-64'
import { configuration } from '../../configuration'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { BypassedSteamIds } from './views/html/bypassed-steam-ids'
import { PlayerRole } from '../../database/models/player.model'
import { requestContext } from '@fastify/request-context'
import { collections } from '../../database/collections'

export default fp(
  async app => {
    app
      .withTypeProvider<ZodTypeProvider>()
      .get(
        '/admin/bypass-registration-restrictions',
        {
          config: {
            authorize: [PlayerRole.admin],
          },
        },
        async (request, reply) => {
          return reply.html(BypassRegistrationRestrictionsPage({ user: request.user! }))
        },
      )
      .post(
        '/admin/bypass-registration-restrictions',
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

          const isRegistered = (await collections.players.countDocuments({ steamId })) > 0
          if (isRegistered) {
            requestContext.set('messages', { error: ['Player is already registered'] })
            return reply.html(BypassRegistrationRestrictionsPage({ user: request.user! }))
          }

          const config = await configuration.get('players.bypass_registration_restrictions')
          if (config.some(c => c === steamId)) {
            requestContext.set('messages', { error: ['This Steam ID is already added'] })
            return reply.html(BypassRegistrationRestrictionsPage({ user: request.user! }))
          }

          await configuration.set('players.bypass_registration_restrictions', [...config, steamId])
          requestContext.set('messages', { success: ['Steam ID added'] })
          return reply.html(BypassRegistrationRestrictionsPage({ user: request.user! }))
        },
      )
      .delete(
        '/admin/bypass-registration-restrictions/:steamId',
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
          )
          return reply.html(BypassedSteamIds())
        },
      )
  },
  {
    name: 'admin panel - bypass registration restrictions',
  },
)
