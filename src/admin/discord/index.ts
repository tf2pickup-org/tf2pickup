import fp from 'fastify-plugin'
import { z } from 'zod'
import { standardAdminPage } from '../standard-admin-page'
import { DiscordPage } from './views/html/discord.page'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { discord } from '../../discord'
import { GuildConfiguration } from './views/html/guild-configuration'
import { configuration } from '../../configuration'

const adminPage = standardAdminPage({
  path: '/admin/discord',
  page: async user => await DiscordPage({ user }),
  bodySchema: z.object({}),
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  save: async () => {},
})

export default fp(
  async app => {
    await app.register(adminPage)
    app
      .withTypeProvider<ZodTypeProvider>()
      .put(
        '/admin/discord/:guildId/toggle',
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
      .post(
        '/admin/discord/:guildId',
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
  },
  {
    name: 'admin panel - discord',
  },
)
