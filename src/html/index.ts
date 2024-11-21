import fp from 'fastify-plugin'
import './watcher'
import { bundle } from './bundle'
import { embed } from './embed'

interface BundleInfo {
  entryPoint: string
  fileName: string
  dependencies: string[]
}
export const bundleInfos: BundleInfo[] = []
export const bundles = new Map<string, string>()

export const html = {
  bundle,
  embed,
} as const

export default fp(
  async app => {
    await app.register((await import('./middleware/htmx')).default)
    await app.register((await import('./plugins/serve-dev-bundles')).default)
  },
  {
    name: 'html',
  },
)
