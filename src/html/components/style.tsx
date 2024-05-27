import postcss from 'postcss'
import tailwindcssNesting from 'tailwindcss/nesting'
import tailwindcss from 'tailwindcss'
import lightenDarken from 'postcss-lighten-darken'
import autoprefixer from 'autoprefixer'
import { readFile } from 'fs/promises'
import { parse } from 'path'

export async function Style(props: { fileName: string }) {
  const css = await readFile(props.fileName)
  const { name, ext } = parse(props.fileName)
  const style = (
    await postcss([tailwindcssNesting, tailwindcss, lightenDarken, autoprefixer]).process(css, {
      from: `${name}.${ext}`,
      to: `${name}.min${ext}`,
    })
  ).css

  return (
    <style type="text/css" safe>
      {style}
    </style>
  )
}
