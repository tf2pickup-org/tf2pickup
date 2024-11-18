import fp from 'fastify-plugin'
import { build } from 'esbuild'
import { logger } from '../logger'
import { environment } from '../environment'
import { z } from 'zod'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import postcssPlugin from '@deanc/esbuild-plugin-postcss'
import atImport from 'postcss-import'
import tailwindcssNesting from 'tailwindcss/nesting/index.js'
import tailwindcss from 'tailwindcss'
import lightenDarken from 'postcss-lighten-darken'
import autoprefixer from 'autoprefixer'
import { extname, parse, resolve } from 'path'
import mime from 'mime'
import { readFile } from 'fs/promises'
import postcss from 'postcss'
import cssnano from 'cssnano'

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
    external: ['*.png', '*.woff2', '*.woff', '*.ttf'],
    plugins: [
      postcssPlugin({
        plugins: [
          atImport({
            path: [resolve(import.meta.dirname, '..', '..')],
          }),
          tailwindcssNesting,
          tailwindcss,
          lightenDarken,
          autoprefixer,
        ],
      }),
    ],
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

  const id = output.hash.replaceAll('/', '')
  const ext = extname(entryPoint)
  const fileName = `${id}${ext}`
  bundles.set(fileName, output.text)

  const url = `/bundles/${fileName}`
  logger.debug({ entryPoint, url, id, type: mime.getType(fileName) }, `bundle ${entryPoint} ready`)
  return url
}

export async function embed(fileName: string): Promise<string> {
  logger.debug(`building ${fileName}...`)
  const css = await readFile(fileName)
  const { name, ext } = parse(fileName)
  const style = (
    await postcss([
      tailwindcssNesting,
      tailwindcss,
      lightenDarken,
      autoprefixer,
      ...(environment.NODE_ENV === 'production' ? [cssnano] : []),
    ]).process(css, {
      from: `${name}${ext}`,
      to: `${name}.min${ext}`,
    })
  ).css
  logger.debug({ type: mime.getType(fileName), length: style.length }, `${fileName} built`)
  return style
}

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
  },
  {
    name: 'html',
  },
)
