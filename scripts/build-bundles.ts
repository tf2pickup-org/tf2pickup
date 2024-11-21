#!/usr/bin/env -S pnpm tsx

import { build } from 'esbuild'
import { glob } from 'glob'
import { parse, resolve } from 'path'
import postcss from 'postcss'
import postcssImport from 'postcss-import'
import tailwindcssNesting from 'tailwindcss/nesting/index.js'
import tailwindcss from 'tailwindcss'
import lightenDarken from 'postcss-lighten-darken'
import autoprefixer from 'autoprefixer'
import { readFile, writeFile } from 'fs/promises'

const distDir = resolve(import.meta.dirname, '..', 'dist')
const publicDir = resolve(distDir, 'public')
const srcDir = resolve(import.meta.dirname, '..', 'src')

interface BundleInfo {
  entryPoint: string
  url: string
}

const bundles: BundleInfo[] = []

const result = await build({
  entryPoints: [
    ...(await glob(`${srcDir}/**/@client/index.ts`)),
    ...(await glob(`${srcDir}/**/main.css`)),
  ],
  entryNames: '[hash]',
  bundle: true,
  platform: 'browser',
  treeShaking: true,
  write: true,
  minify: true,
  metafile: true,
  outbase: srcDir,
  outdir: publicDir,
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

for (const [output, outputInfo] of Object.entries(result.metafile.outputs)) {
  if (!outputInfo.entryPoint) {
    continue
  }
  const { name, ext } = parse(output)
  bundles.push({ url: `/${name}${ext}`, entryPoint: outputInfo.entryPoint })
}

await writeFile(resolve(distDir, 'bundles.json'), JSON.stringify(bundles, null, 2))
process.exit(0)
