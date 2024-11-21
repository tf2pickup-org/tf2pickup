import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import { srcDir } from '../src-dir'
import { logger } from '../logger'

async function readPreBuiltBundles() {
  const buildInfoPath = resolve(srcDir, '..', 'bundles.json')
  try {
    const bundleInfoSchema = z.array(
      z.object({
        entryPoint: z.string(),
        url: z.string(),
      }),
    )
    const buildInfo = bundleInfoSchema.parse(
      await JSON.parse((await readFile(buildInfoPath)).toString('utf-8')),
    )
    return buildInfo
  } catch (error) {
    /* ignore */
    return []
  }
}

export const preBuiltBundles = await readPreBuiltBundles()
logger.info(`read ${preBuiltBundles.length} pre-built bundles`)
