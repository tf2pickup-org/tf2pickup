import { environment } from '../environment'

export function makeTitle(titleBase: string) {
  return `${titleBase} • ${environment.WEBSITE_NAME}`
}
