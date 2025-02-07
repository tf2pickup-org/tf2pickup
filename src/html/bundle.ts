import { build } from 'esbuild'
import { environment } from '../environment'
import { parse } from 'node:path'
import { logger } from '../logger'
import { memoize } from 'es-toolkit'

// fileName <-> bundle
export const bundles = new Map<string, string>()

export const bundle = environment.NODE_ENV === 'production' ? memoize(doBundle) : doBundle

// Bundle JS code under entryPoint and return the path to the bundled file
async function doBundle(entryPoint: string): Promise<string> {
  const { name } = parse(entryPoint)

  const ret = await build({
    entryPoints: [entryPoint],
    platform: 'browser',
    bundle: true,
    format: 'esm',
    minify: environment.NODE_ENV === 'production',
    write: false,
  })

  const [output] = ret.outputFiles
  if (!output) {
    throw new Error(`failed to bundle ${entryPoint}`)
  }

  const fileName = `${name}-${output.hash}.js`
  const url = `/${encodeURIComponent(fileName)}`
  logger.debug({ entryPoint, fileName, url }, 'bundle ready')
  bundles.set(fileName, output.text)
  return url
}
