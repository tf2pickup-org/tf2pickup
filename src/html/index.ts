import fp from 'fastify-plugin'
import { z } from 'zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import mime from 'mime'
import { resolve } from 'node:path'

export const csses = new Map<string, string>()

export default fp(
  async app => {
    await app.register((await import('@fastify/autoload')).default, {
      dir: resolve(import.meta.dirname, 'middleware'),
    })

    app.withTypeProvider<ZodTypeProvider>().get(
      '/css/:fileName',
      {
        schema: {
          params: z.object({
            fileName: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const fileName = request.params.fileName
        if (!csses.has(fileName)) {
          return await reply.notFound()
        }

        return reply
          .header('Content-Type', `${mime.getType(fileName)}; charset=utf-8`)
          .send(csses.get(fileName))
      },
    )
  },
  {
    name: 'html',
  },
)
