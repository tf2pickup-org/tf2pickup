import { logger } from '../logger'
import { relative, resolve } from 'node:path'
import mime from 'mime'
import { bundleInfos, bundles } from '.'
import { events } from '../events'
import { srcDir } from '../src-dir'
import { preBuiltBundles } from './pre-built-bundles'
import { build } from './build'

export async function bundle(entryPoint: string): Promise<string> {
  const entryPointRelative = relative(resolve(srcDir, '..'), entryPoint)
  const preBuilt = preBuiltBundles.find(({ entryPoint }) => entryPoint === entryPointRelative)
  if (preBuilt) {
    logger.debug(preBuilt, `bundle ${entryPoint} is pre-built`)
    return preBuilt.url
  }

  logger.debug(`bundling ${entryPoint}...`)
  const { fileName, dependencies, content } = await build(entryPoint)
  bundles.set(fileName, content)

  const url = `/__dev-bundles/${fileName}`
  logger.debug({ dependencies, entryPoint, url, type: mime.getType(fileName) }, `bundle ready`)

  const i = bundleInfos.findIndex(({ entryPoint: e }) => entryPoint === e)
  if (i > -1) {
    bundleInfos.splice(i, 1)
  }
  bundleInfos.push({ entryPoint, fileName, dependencies })

  events.emit('build:bundleReady', { entryPoint })
  logger.debug({ dependencies, entryPoint, url, type: mime.getType(fileName) }, `bundle ready`)
  return url
}
