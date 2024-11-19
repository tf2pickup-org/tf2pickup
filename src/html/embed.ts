import { readFile } from 'fs/promises'
import { logger } from '../logger'
import { parse } from 'node:path'
import postcss from 'postcss'
import cssnano from 'cssnano'
import tailwindcssNesting from 'tailwindcss/nesting/index.js'
import tailwindcss from 'tailwindcss'
import lightenDarken from 'postcss-lighten-darken'
import autoprefixer from 'autoprefixer'
import { environment } from '../environment'
import mime from 'mime'

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
