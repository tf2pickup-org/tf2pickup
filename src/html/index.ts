import fp from 'fastify-plugin'
import { z } from 'zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import mime from 'mime'
import { RefreshPage } from './components/refresh-page'
import { events } from '../events'
import './watcher'
import { bundle } from './bundle'
import { embed } from './embed'

export const bundles = new Map<string, string>()

interface BundleInfo {
  fileName: string
  dependencies: string[]
}
export const bundleInfos = new Map<string, BundleInfo>()

export const html = {
  bundle,
  embed,
} as const

export default fp(
  async app => {
    app.withTypeProvider<ZodTypeProvider>().get(
      '/bundles/:fileName',
      {
        schema: {
          params: z.object({
            fileName: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const fileName = request.params.fileName
        if (!bundles.has(fileName)) {
          return await reply.notFound()
        }

        return reply
          .header('Content-Type', `${mime.getType(fileName)}; charset=utf-8`)
          .send(bundles.get(fileName))
      },
    )

    events.on('build:bundleReady', async () => {
      const refresh = await RefreshPage()
      app.gateway.broadcast(() => refresh)
    })
  },
  {
    name: 'html',
  },
)
