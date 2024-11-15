import fp from 'fastify-plugin'
import { build } from 'esbuild'
import { logger } from '../logger'
import { environment } from '../environment'
import { z } from 'zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { nanoid } from 'nanoid'

const bundles = new Map<string, string>()

export async function bundle(entryPoint: string): Promise<string> {
  logger.debug(`bundling ${entryPoint}...`)
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'browser',
    treeShaking: true,
    write: false,
    minify: environment.NODE_ENV === 'production',
    define: {
      THUMBNAIL_SERVICE_URL: `"${environment.THUMBNAIL_SERVICE_URL}"`,
    },
  })

  for (const error of result.errors) {
    logger.error(JSON.stringify(error))
  }

  for (const warning of result.warnings) {
    logger.warn(JSON.stringify(warning))
  }

  const [output] = result.outputFiles
  if (!output) {
    throw new Error('failed to generate bundle')
  }

  const id = nanoid()
  bundles.set(id, output.text)

  logger.debug(
    {
      entryPoint,
      url: `/bundles/${id}.js`,
      id,
    },
    `bundle ${entryPoint} ready`,
  )
  return `/bundles/${id}.js`
}

export default fp(
  async app => {
    app.withTypeProvider<ZodTypeProvider>().get(
      '/bundles/:id.js',
      {
        schema: {
          params: z.object({
            id: z.string(),
          }),
        },
      },
      async (request, reply) => {
        const id = request.params.id
        if (!bundles.has(id)) {
          return await reply.notFound()
        }

        return reply.header('Content-Type', 'text/javascript').send(bundles.get(id))
      },
    )
  },
  {
    name: 'html',
  },
)
