import fp from 'fastify-plugin'
import postcss from 'postcss'
import tailwindcssNesting from 'tailwindcss/nesting'
import tailwindcss from 'tailwindcss'
import lightenDarken from 'postcss-lighten-darken'
import autoprefixer from 'autoprefixer'
import atImport from 'postcss-import'
import { readFile } from 'fs/promises'
import { parse, resolve } from 'path'

// eslint-disable-next-line @typescript-eslint/require-await
export default fp(async app => {
  app.get('/main.css', async (_request, reply) => {
    const file = resolve(import.meta.dirname, 'main.css')
    const css = await readFile(file)
    const { name, ext } = parse(file)
    const style = (
      await postcss([
        atImport({
          path: [import.meta.dirname],
        }),
        tailwindcssNesting,
        tailwindcss,
        lightenDarken,
        autoprefixer,
      ]).process(css, {
        from: `${name}.${ext}`,
        to: `${name}.min${ext}`,
      })
    ).css

    await reply.header('Content-Type', 'text/css').send(style)
  })
})
