import { z } from 'zod'
import { discord } from '../../../../discord'
import { configuration } from '../../../../configuration'
import { GuildConfiguration } from '../../../../admin/discord/views/html/guild-configuration'
import { routes } from '../../../../utils/routes'

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  app
    .post(
      '/',
      {
        schema: {
          body: z.object({
            adminNotificationsChannel: z.string().optional(),
            substituteNotificationsChannel: z.string().optional(),
            substituteNotificationsMentionRole: z.string().optional(),
            queuePromptsChannel: z.string().optional(),
          }),
          params: z.object({
            guildId: z.string(),
          }),
        },
      },
      async (request, reply) => {
        if (!discord.client) {
          return reply.badRequest('discord integration is disabled')
        }

        const { guildId } = request.params
        const guild = discord.client.guilds.resolve(guildId)
        if (!guild) {
          return reply.notFound()
        }

        const guildConfig = {
          id: guildId,
          ...(request.body.substituteNotificationsChannel
            ? {
                substituteNotifications: {
                  channel: request.body.substituteNotificationsChannel,
                  role: request.body.substituteNotificationsMentionRole ?? undefined,
                },
              }
            : {}),
          ...(request.body.queuePromptsChannel
            ? {
                queuePrompts: {
                  channel: request.body.queuePromptsChannel,
                  bumpPlayerThresholdRatio: 0.5,
                },
              }
            : {}),
          ...(request.body.adminNotificationsChannel
            ? {
                adminNotifications: {
                  channel: request.body.adminNotificationsChannel,
                },
              }
            : {}),
        }
        const config = await configuration.get('discord.guilds')
        await configuration.set('discord.guilds', [
          ...config.filter(({ id }) => id !== guildId),
          guildConfig,
        ])
        return reply.html(GuildConfiguration({ guild, enabled: true }))
      },
    )
    .put(
      '/toggle',
      {
        schema: {
          params: z.object({
            guildId: z.string(),
          }),
          body: z.record(z.string(), z.literal('on')),
        },
      },
      async (request, reply) => {
        if (!discord.client) {
          return reply.badRequest('discord integration is disabled')
        }

        const { guildId } = request.params
        const guild = discord.client.guilds.resolve(guildId)
        if (!guild) {
          return reply.notFound()
        }

        const enabled = guildId in request.body
        const config = await configuration.get('discord.guilds')
        if (enabled) {
          config.push({ id: guildId })
          await configuration.set('discord.guilds', config)
        } else {
          await configuration.set(
            'discord.guilds',
            config.filter(({ id }) => id !== guildId),
          )
        }

        return reply.html(GuildConfiguration({ guild, enabled }))
      },
    )
})
