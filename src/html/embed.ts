import { readFile } from 'fs/promises'
import { logger } from '../logger'
import { parse } from 'node:path'
import { environment } from '../environment'
import mime from 'mime'
import { memoize } from 'es-toolkit'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import postcssNested from 'postcss-nested'
import cssnano from 'cssnano'

// For production, we memoize the result of the embed function to avoid rebuilding the same file multiple times
export const embed = environment.NODE_ENV === 'production' ? memoize(doEmbed) : doEmbed

async function doEmbed(fileName: string): Promise<string> {
  logger.debug(`building ${fileName}...`)
  const css = await readFile(fileName, 'utf-8')
  const { name, ext, dir } = parse(fileName)

  logger.trace({ dir, name, ext }, 'doEmbed()')

  const style = (
    await postcss([
      postcssNested,
      tailwindcss({ optimize: false }),
      ...(environment.NODE_ENV === 'production' ? [cssnano] : []),
    ]).process(css, {
      from: fileName,
      to: `${name}.min${ext}`,
    })
  ).css

  logger.debug({ type: mime.getType(fileName), length: style.length }, `${fileName} built`)
  return style
}
