import { environment } from '../environment'
import { logger } from '../logger'
import { build } from 'esbuild'
import postcssPlugin from '@deanc/esbuild-plugin-postcss'
import atImport from 'postcss-import'
import tailwindcssNesting from 'tailwindcss/nesting/index.js'
import tailwindcss from 'tailwindcss'
import lightenDarken from 'postcss-lighten-darken'
import autoprefixer from 'autoprefixer'
import { extname, resolve } from 'node:path'
import mime from 'mime'
import { bundleInfos, bundles } from '.'
import { events } from '../events'

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
    metafile: true,
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

  const rootDir = resolve(import.meta.dirname, '..', '..')
  const meta = Object.values(result.metafile.outputs)[0]
  if (meta) {
    const dependencies = Object.keys(meta.inputs)
      .filter(i => !i.startsWith('node_modules'))
      .map(d => resolve(rootDir, d))
    bundleInfos.set(entryPoint, { fileName, dependencies })
  }

  events.emit('build:bundleReady', { entryPoint })

  const url = `/bundles/${fileName}`
  logger.debug({ entryPoint, url, id, type: mime.getType(fileName) }, `bundle ready`)
  return url
}
