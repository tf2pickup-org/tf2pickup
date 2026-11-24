import type { FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { PlayerRole } from '../../../database/models/player.model'
import { QueueSettingsPage } from '../../../admin/queues/views/html/queue-settings.page'
import { QueuesPage } from '../../../admin/queues/views/html/queues.page'
import { queues } from '../../../queues'
import { queuePresets } from '../../../queues/presets'
import { Gamemode } from '../../../shared/types/gamemode'
import { routes } from '../../../utils/routes'
import { durationUnit } from '../../../admin/games/duration-unit'
import { MapPoolEntry as MapPoolEntryCmp } from '../../../admin/queues/views/html/map-pool-entry'
import { MapVoteOptions } from '../../../admin/queues/views/html/map-vote-options'
import type { MapPoolEntry } from '../../../database/models/map-pool-entry.model'
import { mapPool } from '../../../maps/pool'
import { activityLog } from '../../../activity-log'
import { autoEngine } from '../../../queues/auto'
import { collections } from '../../../database/collections'
import { FlashMessage } from '../../../html/components/flash-message'

const slugParams = z.object({ slug: z.string() })

// A single form field is submitted as a scalar, multiple as an array; normalize both to an array.
const formArray = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value): unknown[] => {
    if (value === undefined) return []
    return Array.isArray(value) ? (value as unknown[]) : [value]
  }, z.array(schema))

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
            launchMode: z.enum(['auto', 'captain']).default('auto'),
          }),
        },
      },
      async (request, reply) => {
        const { template, slug, name, gamemode, launchMode } = request.body
        await act(request, reply, '/admin/queues', async () => {
          const preset = queuePresets.find(p => p.slug === template)
          const { maps, ...base } = preset ?? { gamemode, maps: [] }
          await queues.create(
            { ...base, launchMode, slug, name },
            maps,
            request.user!.player.steamId,
          )
          return `Queue ${slug} added`
        })
      },
    )
    .get('/:slug', { config, schema: { params: slugParams } }, async (request, reply) => {
      const queue = await queues.bySlug(request.params.slug)
      await reply.status(200).html(QueueSettingsPage({ queue, tab: 'general' }))
    })
    .get('/:slug/maps', { config, schema: { params: slugParams } }, async (request, reply) => {
      const queue = await queues.bySlug(request.params.slug)
      await reply.status(200).html(QueueSettingsPage({ queue, tab: 'maps' }))
    })
    .get('/:slug/timers', { config, schema: { params: slugParams } }, async (request, reply) => {
      const queue = await queues.bySlug(request.params.slug)
      await reply.status(200).html(QueueSettingsPage({ queue, tab: 'timers' }))
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
              whitelistId: body.whitelistId.trim() || null,
            },
            request.user!.player.steamId,
          )
          return 'Configuration saved'
        })
      },
    )
    .post(
      '/:slug/timers',
      {
        config,
        schema: {
          params: slugParams,
          body: z.object({
            readyUpTimeout: z.coerce.number().positive(),
            readyUpTimeoutUnit: z.enum(durationUnit.all).default('seconds'),
            readyStateTimeout: z.coerce.number().positive(),
            readyStateTimeoutUnit: z.enum(durationUnit.all).default('seconds'),
            pickTimeout: z.coerce.number().positive().optional(),
            pickTimeoutUnit: z.enum(durationUnit.all).default('seconds'),
          }),
        },
      },
      async (request, reply) => {
        const queue = await queues.bySlug(request.params.slug)
        const body = request.body
        await act(request, reply, `/admin/queues/${queue.slug}/timers`, async () => {
          await queues.update(
            queue._id,
            {
              readyUpTimeout: durationUnit.toMs(body.readyUpTimeout, body.readyUpTimeoutUnit),
              readyStateTimeout: durationUnit.toMs(
                body.readyStateTimeout,
                body.readyStateTimeoutUnit,
              ),
              ...(body.pickTimeout === undefined
                ? {}
                : { pickTimeout: durationUnit.toMs(body.pickTimeout, body.pickTimeoutUnit) }),
            },
            request.user!.player.steamId,
          )
          return 'Configuration saved'
        })
      },
    )
    .post(
      '/:slug/maps',
      {
        config,
        schema: {
          params: slugParams,
          body: z
            .object({
              'name[]': formArray(z.string()),
              'execConfig[]': formArray(z.string()),
            })
            .refine(
              ({ 'name[]': name, 'execConfig[]': execConfig }) => name.length === execConfig.length,
              { message: 'name[] and execConfig[] must be of the same length' },
            )
            .transform(({ 'name[]': name, 'execConfig[]': execConfig }) => ({
              maps: name.map((mapName, i): MapPoolEntry => ({
                name: mapName,
                execConfig: execConfig[i],
              })),
            })),
        },
      },
      async (request, reply) => {
        const queue = await queues.bySlug(request.params.slug)
        await act(request, reply, `/admin/queues/${queue.slug}/maps`, async () => {
          const newMaps = await mapPool.set(queue._id, request.body.maps)
          await activityLog.record({ type: 'map pool change', maps: newMaps.map(m => m.name) })
          return 'Configuration saved'
        })
      },
    )
    .post(
      '/:slug/maps/entry',
      { config, schema: { params: slugParams } },
      async (_request, reply) => {
        await reply.html(MapPoolEntryCmp({ name: '' }))
      },
    )
    .put(
      '/:slug/maps/scramble',
      { config, schema: { params: slugParams } },
      async (request, reply) => {
        const queue = await queues.bySlug(request.params.slug)
        await autoEngine.scrambleMaps(queue._id)
        const newMaps = await collections.queueMapOptions
          .find({ queue: queue._id }, { projection: { name: 1 } })
          .toArray()
        await activityLog.recordMapScramble(
          request.user!.player.steamId,
          newMaps.map(m => m.name),
        )
        await reply.html(
          <>
            <MapVoteOptions queue={queue._id} />
            <FlashMessage type="success" message="Maps scrambled" />
          </>,
        )
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
})
