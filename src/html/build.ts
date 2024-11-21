import { build as esBuild } from 'esbuild'
import { environment } from '../environment'
import postcss from 'postcss'
import postcssImport from 'postcss-import'
import tailwindcssNesting from 'tailwindcss/nesting/index.js'
import tailwindcss from 'tailwindcss'
import lightenDarken from 'postcss-lighten-darken'
import autoprefixer from 'autoprefixer'
import { extname, parse, relative, resolve, sep } from 'node:path'
import { readFile } from 'node:fs/promises'
import { logger } from '../logger'

interface WriteBuildOutput {
  fileName: string
  dependencies: string[]
  content: string
}

export async function build(entryPoint: string): Promise<WriteBuildOutput> {
  const result = await esBuild({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'browser',
    treeShaking: true,
    write: false,
    minify: environment.NODE_ENV === 'production',
    metafile: true,
    external: ['*.png', '*.woff2', '*.woff', '*.ttf'],
    plugins: [
      {
        name: 'postcss',
        setup: build => {
          build.onLoad({ filter: /.\.(css)$/, namespace: 'file' }, async args => {
            const { ext, dir, name } = parse(args.path)
            const file = await readFile(args.path)
            const result = await postcss(
              postcssImport({
                path: [dir],
              }),
              tailwindcssNesting,
              tailwindcss,
              lightenDarken,
              autoprefixer,
            ).process(file, {
              from: args.path,
              to: `${name}.min${ext}`,
            })

            return {
              contents: result.css,
              loader: 'css',
            }
          })
        },
      },
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

  const e = Object.entries(result.metafile.outputs)
  if (e.length !== 1) {
    throw new Error(`bad metafile`)
  }

  const [outputPath, meta] = e[0]!
  const rootDir = resolve(import.meta.dirname, '..', '..')
  const dependencies = Object.keys(meta.inputs)
    .filter(i => !i.startsWith('node_modules'))
    .map(d => resolve(rootDir, d))

  const ext = extname(outputPath)
  const { name, dir } = parse(entryPoint)
  const fileName = relative(rootDir, dir).split(sep).join('_') + `_${name}${ext}`
  return { fileName, dependencies, content: output.text }
}
