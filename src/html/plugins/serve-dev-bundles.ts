import fp from 'fastify-plugin'
import { environment } from '../../environment'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { bundles } from '..'
import mime from 'mime'
import { events } from '../../events'
import { RefreshPage } from '../components/refresh-page'

export default fp(
  async app => {
    if (environment.NODE_ENV !== 'production') {
      app.withTypeProvider<ZodTypeProvider>().get(
        '/__dev-bundles/:fileName',
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
    }
  },
  {
    name: 'serve dev bundles',
  },
)
