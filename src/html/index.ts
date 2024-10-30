import { build } from 'esbuild'
import fp from 'fastify-plugin'
import { resolve } from 'node:path'
import { logger } from '../logger'
import { environment } from '../environment'

export async function bundle(entryPoint: string): Promise<string> {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'browser',
    treeShaking: true,
    write: false,
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

  return output.text
}

export default fp(async app => {
  app.get('/bundle.js', async (_request, reply) => {
    await reply
      .header('Content-Type', 'text/javascript')
      .send(await bundle(resolve(import.meta.dirname, 'bundle', 'main.js')))
  })
})
