import { logger } from '../logger'
import mime from 'mime'
import { build } from './build'

export async function embed(entryPoint: string): Promise<string> {
  logger.debug(`building ${entryPoint}...`)
  const { fileName, content } = await build(entryPoint)
  logger.debug({ type: mime.getType(fileName), length: content.length }, `${entryPoint} built`)
  return content
}
