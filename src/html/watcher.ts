import { resolve } from 'node:path'
import { environment } from '../environment'
import { logger } from '../logger'
import { debounce } from 'lodash-es'
import { watch, type FileChangeInfo } from 'node:fs/promises'
import { bundleInfos } from '.'
import { bundle } from './bundle'

if (environment.NODE_ENV !== 'production') {
  const rootDir = resolve(import.meta.dirname, '..')
  logger.info(`watching for bundle changes in ${rootDir}`)

  const rebuildBundle = debounce(async (event: FileChangeInfo<string>) => {
    if (event.filename === null) {
      return
    }

    const file = resolve(rootDir, event.filename)

    const bundlesToRebuild = bundleInfos.filter(({ dependencies }) => dependencies.includes(file))
    if (bundlesToRebuild.length > 0) {
      logger.info(`${file} has changed; rebuilding dependees...`)
    }

    for (const { entryPoint } of bundlesToRebuild) {
      await bundle(entryPoint)
    }
  }, 100)

  ;(async () => {
    const watcher = watch(rootDir, { recursive: true })
    for await (const event of watcher) {
      rebuildBundle(event)
    }
  })()
}
