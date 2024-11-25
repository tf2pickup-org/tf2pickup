import { logger } from '../logger'
import { parse, relative, resolve } from 'node:path'
import mime from 'mime'
import { csses } from '.'
import { embed } from './embed'

export async function bundle(entryPoint: string): Promise<string> {
  const css = await embed(entryPoint)
  const { ext, dir } = parse(entryPoint)
  const rootDir = resolve(import.meta.dirname, '..', '..')
  const id = relative(rootDir, dir).replaceAll('/', '_')
  const fileName = `${id}${ext}`
  csses.set(fileName, css)

  const url = `/css/${fileName}`
  logger.debug({ entryPoint, url, id, type: mime.getType(fileName) }, `bundle ready`)
  return url
}
