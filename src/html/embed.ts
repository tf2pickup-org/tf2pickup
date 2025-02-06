import { readFile } from 'fs/promises'
import { logger } from '../logger'
import { parse, resolve } from 'node:path'
import postcss from 'postcss'
import postcssImport from 'postcss-import'
import cssnano from 'cssnano'
import tailwindcssNesting from 'tailwindcss/nesting/index.js'
import tailwindcss from 'tailwindcss'
import lightenDarken from 'postcss-lighten-darken'
import autoprefixer from 'autoprefixer'
import { environment } from '../environment'
import mime from 'mime'
import { memoize } from 'es-toolkit'

const srcDir = resolve(import.meta.dirname, '..')

// For production, we memoize the result of the embed function to avoid rebuilding the same file multiple times
export const embed = environment.NODE_ENV === 'production' ? memoize(doEmbed) : doEmbed

async function doEmbed(fileName: string): Promise<string> {
  logger.debug(`building ${fileName}...`)
  const css = await readFile(fileName)
  const { name, ext, dir } = parse(fileName)
  const style = (
    await postcss([
      postcssImport({
        path: [dir, srcDir],
      }),
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
