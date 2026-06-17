import { PlayerRole } from '../../../database/models/player.model'
import {
  MapPoolEntry as MapPoolEntryCmp,
  MapPoolPage,
} from '../../../admin/map-pool/views/html/map-pool.page'
import { z } from 'zod'
import type { MapPoolEntry } from '../../../database/models/map-pool-entry.model'
import { mapPool } from '../../../maps/pool'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'
import { activityLog } from '../../../activity-log'

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
        await reply.status(200).html(MapPoolPage())
      },
    )
    .post(
      '/',
      {
        config: {
          authorize: [PlayerRole.admin],
        },
        schema: {
          body: z
            .object({
              'name[]': z.array(z.string()),
              'execConfig[]': z.array(z.string()),
            })
            .refine(
              ({ 'name[]': name, 'execConfig[]': execConfig }) => name.length === execConfig.length,
              {
                message: 'name[] and execConfig[] must be of the same length',
              },
            )
            .transform(({ 'name[]': name, 'execConfig[]': execConfig }) => {
              const maps: MapPoolEntry[] = []
              for (let i = 0; i < name.length; ++i) {
                maps.push({ name: name[i]!, execConfig: execConfig[i] })
              }
              return { maps }
            }),
        },
      },
      async (request, reply) => {
        const newMaps = await mapPool.set(request.body.maps)
        await activityLog.record({ type: 'map pool change', maps: newMaps.map(m => m.name) })
        requestContext.set('messages', { success: ['Configuration saved'] })
        await reply.status(200).html(MapPoolPage())
      },
    )
    .post('/create', async (_request, response) => {
      return await response.send(await MapPoolEntryCmp({ name: '' }))
    })
})
