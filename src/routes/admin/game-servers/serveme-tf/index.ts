import { KnownEndpoint } from '@tf2pickup-org/serveme-tf-client'
import { PlayerRole } from '../../../../database/models/player.model'
import { z } from 'zod'
import { BannedGameServersList } from '../../../../admin/game-servers/views/html/serveme-tf-ban-gameservers'
import { RegionList } from '../../../../admin/game-servers/views/html/serveme-tf-preferred-region'
import { ServemeTfSettings } from '../../../../admin/game-servers/views/html/serveme-tf-settings'
import { configuration } from '../../../../configuration'
import { logger } from '../../../../logger'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .get(
      '/preferred-region',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
      },
      async (_request, reply) => {
        return reply.status(200).html(RegionList())
      },
    )
    .put(
      '/enabled',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            servemeTfEnabled: z.enum(['true', 'false']).transform(value => value === 'true'),
          }),
        },
      },
      async (request, reply) => {
        const { servemeTfEnabled } = request.body
        await configuration.set(
          'serveme_tf.enabled',
          servemeTfEnabled,
          request.user!.player.steamId,
        )
        logger.info({ servemeTfEnabled }, 'serveme.tf integration updated')
        return reply.status(200).html(ServemeTfSettings({ savedSection: 'enabled' }))
      },
    )
    .put(
      '/endpoint',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            servemeTfApiEndpoint: z.enum(KnownEndpoint),
          }),
        },
      },
      async (request, reply) => {
        const { servemeTfApiEndpoint } = request.body
        await configuration.set(
          'serveme_tf.api_endpoint',
          servemeTfApiEndpoint,
          request.user!.player.steamId,
        )
        logger.info({ servemeTfApiEndpoint }, 'serveme.tf api endpoint updated')
        return reply.status(200).html(ServemeTfSettings({ savedSection: 'endpoint' }))
      },
    )
    .put(
      '/api-key',
      {
        config: {
          authorize: [PlayerRole.superUser],
        },
        schema: {
          body: z.object({
            servemeTfApiKey: z.string().min(1),
          }),
        },
      },
      async (request, reply) => {
        const { servemeTfApiKey } = request.body
        await configuration.set('serveme_tf.api_key', servemeTfApiKey, request.user!.player.steamId)
        logger.info('serveme.tf api key updated')
        return reply.status(200).html(ServemeTfSettings({ savedSection: 'apiKey' }))
      },
    )
    .delete(
      '/api-key',
      {
        config: {
          authorize: [PlayerRole.superUser],
        },
      },
      async (request, reply) => {
        await configuration.set('serveme_tf.api_key', null, request.user!.player.steamId)
        logger.info('serveme.tf api key cleared')
        return reply.status(200).html(ServemeTfSettings({ savedSection: 'apiKey' }))
      },
    )
    .put(
      '/preferred-region',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            servemeTfPreferredRegion: z.string().transform(val => (val === 'none' ? null : val)),
          }),
        },
      },
      async (request, reply) => {
        await configuration.set(
          'serveme_tf.preferred_region',
          request.body.servemeTfPreferredRegion,
          request.user!.player.steamId,
        )
        return reply.status(200).html(RegionList({ saveResult: { success: true } }))
      },
    )
    .post(
      '/ban-gameservers',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z.object({
            pattern: z.string().min(1),
          }),
        },
      },
      async (request, reply) => {
        const { pattern } = request.body
        const config = await configuration.get('serveme_tf.ban_gameservers')

        if (config.some(c => c === pattern)) {
          return reply.status(200).html(BannedGameServersList())
        }

        await configuration.set(
          'serveme_tf.ban_gameservers',
          [...config, pattern],
          request.user!.player.steamId,
        )
        return reply.status(200).html(BannedGameServersList())
      },
    )
    .delete(
      '/ban-gameservers/:pattern',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          params: z.object({
            pattern: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const pattern = decodeURIComponent(request.params.pattern)
        const config = await configuration.get('serveme_tf.ban_gameservers')
        await configuration.set(
          'serveme_tf.ban_gameservers',
          config.filter(c => c !== pattern),
          request.user!.player.steamId,
        )
        return reply.status(200).html(BannedGameServersList())
      },
    )
})
