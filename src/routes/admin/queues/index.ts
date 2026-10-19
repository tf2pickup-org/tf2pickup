import { secondsToMilliseconds } from 'date-fns'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { QueueSettingsPage } from '../../../admin/queues/views/html/queue-settings.page'
import { QueuesPage } from '../../../admin/queues/views/html/queues.page'
import { queues } from '../../../queues'
import { queuePresets } from '../../../queues/presets'
import { Gamemode } from '../../../shared/types/gamemode'
import { routes } from '../../../utils/routes'

const slugParams = z.object({ slug: z.string() })

// Runs an admin action and reports its outcome as a flash message on the redirect target.
async function act(
  request: FastifyRequest,
  reply: FastifyReply,
  redirectTo: string,
  action: () => Promise<string>,
) {
  try {
    request.flash('success', await action())
  } catch (error) {
    if (
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode < 500
    ) {
      request.flash('error', error.message)
    } else if (error instanceof z.ZodError) {
      request.flash('error', error.issues.map(({ message }) => message).join(', '))
    } else {
      throw error
    }
  }
  await reply.redirect(redirectTo)
}

// eslint-disable-next-line @typescript-eslint/require-await
export default routes(async app => {
  const config = { authorize: [PlayerRole.admin] }

  app
    .get('/', { config }, async (_request, reply) => {
      await reply.status(200).html(QueuesPage())
    })
    .post(
      '/',
      {
        config,
        schema: {
          body: z.object({
            template: z.string().default(''),
            slug: z.string(),
            name: z.string(),
            gamemode: z.enum(Gamemode),
          }),
        },
      },
      async (request, reply) => {
        const { template, slug, name, gamemode } = request.body
        await act(request, reply, '/admin/queues', async () => {
          const preset = queuePresets.find(p => p.slug === template)
          const { maps, ...base } = preset ?? { gamemode, launchMode: 'auto' as const, maps: [] }
          await queues.create({ ...base, slug, name }, maps, request.user!.player.steamId)
          return `Queue ${slug} added`
        })
      },
    )
    .get('/:slug', { config, schema: { params: slugParams } }, async (request, reply) => {
      await reply
        .status(200)
        .html(QueueSettingsPage({ queue: await queues.bySlug(request.params.slug) }))
    })
    .post(
      '/:slug',
      {
        config,
        schema: {
          params: slugParams,
          body: z.object({
            name: z.string(),
            requireVerification: z.coerce.boolean().default(false),
            skillThresholdEnabled: z.literal('enabled').optional(),
            skillThreshold: z.coerce.number().optional(),
            readyUpTimeout: z.coerce.number(),
            readyStateTimeout: z.coerce.number(),
            mapCooldown: z.coerce.number(),
            whitelistId: z.string().default(''),
          }),
        },
      },
      async (request, reply) => {
        const queue = await queues.bySlug(request.params.slug)
        const body = request.body
        await act(request, reply, `/admin/queues/${queue.slug}`, async () => {
          await queues.update(
            queue._id,
            {
              name: body.name,
              requireVerification: body.requireVerification,
              skillThreshold: body.skillThresholdEnabled ? (body.skillThreshold ?? 0) : null,
              readyUpTimeout: secondsToMilliseconds(body.readyUpTimeout),
              readyStateTimeout: secondsToMilliseconds(body.readyStateTimeout),
              mapCooldown: body.mapCooldown,
              whitelistId: body.whitelistId.trim() || null,
            },
            request.user!.player.steamId,
          )
          return 'Configuration saved'
        })
      },
    )
    .post('/:slug/enable', { config, schema: { params: slugParams } }, async (request, reply) => {
      const queue = await queues.bySlug(request.params.slug)
      await act(request, reply, '/admin/queues', async () => {
        await queues.enable(queue._id, request.user!.player.steamId)
        return `Queue ${queue.slug} enabled`
      })
    })
    .post('/:slug/disable', { config, schema: { params: slugParams } }, async (request, reply) => {
      const queue = await queues.bySlug(request.params.slug)
      await act(request, reply, '/admin/queues', async () => {
        await queues.disable(queue._id, request.user!.player.steamId)
        return `Queue ${queue.slug} disabled`
      })
    })
    .post('/:slug/delete', { config, schema: { params: slugParams } }, async (request, reply) => {
      const queue = await queues.bySlug(request.params.slug)
      await act(request, reply, '/admin/queues', async () => {
        await queues.remove(queue._id, request.user!.player.steamId)
        return `Queue ${queue.slug} deleted`
      })
    })
    .post(
      '/:slug/move',
      {
        config,
        schema: {
          params: slugParams,
          querystring: z.object({ direction: z.enum(['up', 'down']) }),
        },
      },
      async (request, reply) => {
        const queue = await queues.bySlug(request.params.slug)
        await queues.move(queue._id, request.query.direction)
        await reply.redirect('/admin/queues')
      },
    )
})
