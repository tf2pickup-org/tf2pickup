import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { environment } from '../environment'

const publicDir = resolve(import.meta.dirname, '..', '..', 'public')

export function ogLogoPath() {
  if (environment.WEBSITE_BRANDING) {
    const branded = resolve(publicDir, 'branding', environment.WEBSITE_BRANDING, 'logo.png')
    if (existsSync(branded)) {
      return branded
    }
  }
  return resolve(publicDir, 'logo.png')
}
