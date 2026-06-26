import { resolve } from 'node:path'
import { GlobalFonts } from '@napi-rs/canvas'

const fontPath = resolve(
  import.meta.dirname,
  '..',
  '..',
  'public',
  'fonts',
  'Satoshi-Variable.woff2',
)

let registered = false

export function registerFonts() {
  if (registered) return
  GlobalFonts.registerFromPath(fontPath, 'Satoshi')
  registered = true
}
