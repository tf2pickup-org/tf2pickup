import { PlayerRole } from '../../../database/models/player.model'
import {
  MapPoolEntry as MapPoolEntryCmp,
  MapPoolPage,
} from '../../../admin/map-pool/views/html/map-pool.page'
import { z } from 'zod'
import type { MapPoolEntry } from '../../../database/models/map-pool-entry.model'
import { mapPool } from '../../../queue/map-pool'
import { requestContext } from '@fastify/request-context'
import { routes } from '../../../utils/routes'

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
        reply.status(200).html(await MapPoolPage())
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
        await mapPool.set(request.body.maps)
        requestContext.set('messages', { success: ['Configuration saved'] })
        reply.status(200).html(await MapPoolPage())
      },
    )
    .post('/create', async (_request, response) => {
      return await response.send(await MapPoolEntryCmp({ name: '' }))
    })
})
