import fp from 'fastify-plugin'
import { z } from 'zod'
import { standardAdminPage } from '../plugins/standard-admin-page'
import { MapPoolEntry as MapPoolEntryCmp, MapPoolPage } from './views/html/map-pool.page'
import type { MapPoolEntry } from '../../database/models/map-pool-entry.model'
import { mapPool } from '../../queue/map-pool'

const adminPage = standardAdminPage({
  path: '/admin/map-pool',
  bodySchema: z
    .object({
      'name[]': z.array(z.string()),
      'execConfig[]': z.array(z.string()),
    })
    .refine(({ 'name[]': name, 'execConfig[]': execConfig }) => name.length === execConfig.length, {
      message: 'name[] and execConfig[] must be of the same length',
    })
    .transform(({ 'name[]': name, 'execConfig[]': execConfig }) => {
      const maps: MapPoolEntry[] = []
      for (let i = 0; i < name.length; ++i) {
        maps.push({ name: name[i]!, execConfig: execConfig[i] })
      }
      return { maps }
    }),
  save: async ({ maps }) => {
    await mapPool.set(maps)
  },
  page: async user => await MapPoolPage({ user }),
})

export default fp(
  async app => {
    await app.register(adminPage)
    app.post(
      '/admin/map-pool/create',
      async (request, response) => await response.send(await MapPoolEntryCmp({ name: '' })),
    )
  },
  {
    name: 'admin panel - map pool',
  },
)
