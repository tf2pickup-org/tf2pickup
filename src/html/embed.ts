import { readFile } from 'fs/promises'
import { logger } from '../logger'
import { parse, resolve } from 'node:path'
import { environment } from '../environment'
import mime from 'mime'
import { memoize, noop } from 'es-toolkit'
import { compile } from '@tailwindcss/node'
import postcss from 'postcss'
import lightenDarken from 'postcss-lighten-darken'

// For production, we memoize the result of the embed function to avoid rebuilding the same file multiple times
export const embed = environment.NODE_ENV === 'production' ? memoize(doEmbed) : doEmbed

async function doEmbed(fileName: string): Promise<string> {
  logger.debug(`building ${fileName}...`)
  const css = await readFile(fileName, 'utf-8')
  const { name, ext, dir } = parse(fileName)

  logger.trace({ dir, name, ext }, 'doEmbed()')

  // Compile the CSS using Tailwind CSS v4 API
  const compiler = await compile(css, {
    base: dir,
    from: fileName,
    onDependency: noop,
  })

  // Build the CSS with an empty candidates array since we're processing
  // CSS files that already contain the styles we need
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  let style: string = compiler.build([])

  // Apply postcss-lighten-darken plugin for color manipulation
  const result = await postcss([lightenDarken]).process(style, {
    from: `${name}${ext}`,
    to: `${name}.min${ext}`,
  })
  style = result.css

  logger.debug({ type: mime.getType(fileName), length: style.length }, `${fileName} built`)
  return style
}
